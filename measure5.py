from PIL import Image
im = Image.open('/home/tankztz/.hermes/cache/screenshots/browser_screenshot_430e48d16e0041fa98a1334449784bd3.png').convert('RGB')
w, h = im.size
px = im.load()
print('SIZE', w, h)

def clusters():
    # group consecutive rows with dark pixels into text bands
    rows = {}  # y -> (minx, maxx)
    for y in range(h):
        xs = []
        for x in range(w):
            p = px[x, y]
            if p[0] + p[1] + p[2] < 160 * 3:
                xs.append(x)
        if xs:
            rows[y] = (min(xs), max(xs))
    merged = []
    cur = None
    for y in sorted(rows):
        a, b = rows[y]
        if cur and y - cur[1] <= 12:
            cur[1] = y
            cur[0] = min(cur[0], a)
            cur[2] = max(cur[2], b)
        else:
            if cur:
                merged.append(cur)
            cur = [a, y, b, y]
    if cur:
        merged.append(cur)
    return merged

for c in cluster():
    a, y0, b, y1 = c
    wdt = b - a
    if wdt > 90 or y1 < 600:
        print("y%d-%d: x %d..%d w=%d" % (y0, y1, a, b, wdt))