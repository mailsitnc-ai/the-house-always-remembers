"""Joins recorded WebM segments, in order, into one H.264 MP4 on a fixed canvas (each source is scaled to fit, centred on black; nothing is cropped).
Real timing is kept: output is a constant 30 fps and every tick shows the latest recorded frame. Usage:
  compose.py OUT.mp4 WIDTH HEIGHT SRC[@START-END] [SRC[@START-END] ...]"""
import sys, av, cv2, numpy as np
from fractions import Fraction
out_path, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
specs = []
for a in sys.argv[4:]:
    src, _, rng = a.partition("@")
    s, e = (None, None)
    if rng:
        s, e = rng.split("-")
        s, e = float(s), float(e)
    specs.append((src, s or 0.0, e))
FPS = 30
out = av.open(out_path, "w", options={"movflags": "faststart"})
o = out.add_stream("libx264", rate=FPS)
o.width, o.height, o.pix_fmt = W, H, "yuv420p"
o.options = {"crf": "22", "preset": "veryfast"}
k = 0

def put(img):
    global k
    h, w = img.shape[:2]
    sc = min(W / w, H / h)
    nw, nh = max(1, round(w * sc)), max(1, round(h * sc))
    r = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    canvas = np.zeros((H, W, 3), np.uint8)
    y0, x0 = (H - nh) // 2, (W - nw) // 2
    canvas[y0:y0 + nh, x0:x0 + nw] = r
    return canvas

def emit(canvas):
    global k
    f = av.VideoFrame.from_ndarray(canvas, format="rgb24").reformat(format="yuv420p")
    f.pts = k
    f.time_base = Fraction(1, FPS)
    k += 1
    for p in o.encode(f):
        out.mux(p)

for src, start, end in specs:
    inp = av.open(src)
    vs = inp.streams.video[0]
    t0 = None
    base = k  # output tick at which this source begins
    prev = None
    done = False
    for f in inp.decode(vs):
        if f.pts is None:
            continue
        t = float(f.pts * vs.time_base)
        if t0 is None:
            t0 = t
        t -= t0
        if prev is not None:
            while (k - base) / FPS + start < t and (end is None or (k - base) / FPS + start < end):
                emit(prev)
            if end is not None and (k - base) / FPS + start >= end:
                done = True
                break
        prev = put(f.to_ndarray(format="rgb24")) if (t >= start or prev is None) else prev
        if t < start:
            prev = put(f.to_ndarray(format="rgb24"))
    if not done and prev is not None:
        emit(prev)  # the last frame
    inp.close()
    print(f"{src}: through tick {k} ({k / FPS:.1f} s total)", flush=True)
for p in o.encode():
    out.mux(p)
out.close()
print(f"{out_path}: {k} frames, {k / FPS:.1f} s")
