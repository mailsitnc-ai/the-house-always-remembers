"""Re-wraps a MediaRecorder WebM (VP9, no container duration) as a normal H.264 MP4 that plays in any browser, optionally trimmed.
Output is a constant 30 fps: each output tick shows the latest recorded frame, so real timing is preserved (nothing sped up or slowed).
Usage: convert.py SRC DST [START_SEC] [END_SEC]"""
import sys, av
from fractions import Fraction
src, dst = sys.argv[1], sys.argv[2]
start = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
end = float(sys.argv[4]) if len(sys.argv) > 4 else None
FPS = 30
inp = av.open(src)
vs = inp.streams.video[0]
out = av.open(dst, "w", options={"movflags": "faststart"})
o = out.add_stream("libx264", rate=FPS)
o.width, o.height, o.pix_fmt = vs.width - vs.width % 2, vs.height - vs.height % 2, "yuv420p"
o.options = {"crf": "20", "preset": "medium"}
k = 0
prev = None
t0 = None

def emit(frame):
    global k
    nf = frame.reformat(width=o.width, height=o.height, format="yuv420p")
    nf.pts = k
    nf.time_base = Fraction(1, FPS)
    k += 1
    for p in o.encode(nf):
        out.mux(p)

stop = False
for f in inp.decode(vs):
    if f.pts is None:
        continue
    t = float(f.pts * vs.time_base)
    if t0 is None:
        t0 = t
    t -= t0
    if prev is not None:
        # Show the previous frame until this one's time.
        while (k / FPS) + start < t and (end is None or (k / FPS) + start < end):
            emit(prev)
        if end is not None and (k / FPS) + start >= end:
            break
    prev = f if t >= start or prev is None else prev
    if t < start:
        prev = f
for p in o.encode():
    out.mux(p)
out.close()
inp.close()
print(f"{dst}: {k} frames, {k / FPS:.1f} s")
