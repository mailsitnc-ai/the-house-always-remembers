import sys, av
for f in sys.argv[1:]:
    c = av.open(f); v = c.streams.video[0]
    n = 0; last = 0.0; errs = 0
    try:
        for fr in c.decode(v):
            n += 1; last = float(fr.pts * v.time_base)
    except Exception as e:
        errs += 1; print("ERROR", f, e)
    print(f"{f}: {v.codec_context.name} {v.width}x{v.height}, {n} frames decoded to the end, last frame at {last:.1f} s, streams={[s.type for s in c.streams]}, errors={errs}")
    c.close()
