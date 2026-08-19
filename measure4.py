from PIL import Image
im=Image.open('/home/tankztz/.hermes/cache/screenshots/browser_screenshot_430e48d16e0041fa98a1334449784bd3.png').convert('RGB')
w,h=im.size
px=im.load()
print('SIZE',w,h)
def clusters(thr=160):
    rows={}
    for y in range(h):
        xs=[]
        for x in range(w):
            p=px[x,y]
            if p[0]+p[1]+p[2] < thr*3:
                xs.append(x)
        if xs: rows[y]=(min(xs),max(xs))
    items=sorted(rows.items())
    out=[];cur=None
    for y,(a,b) in items:
        if cur and y-cur[2]<=12:
            cur=[cur[0],max(cur[1],b),y,min(cur[3],a)]
        else:
            if cur: out.append(cur)
            cur=[y,y,a,a]
    # second pass merge
    merged=[];c=None
    for y,(a,b) in sorted(rows.items()):
        if c and y-c[1]<=12:
            c[1]=y; c[0]=min(c[0],a); c[2]=max(c[2],b)
        else:
            if c: merged.append(c)
            c=[a,y,b,y]
    if c: merged.append(c)
    return merged
for c in clusters():
    if c[2]-c[0]>80 or c[3]<600:
        print("y%d-%d: x %d..%d w=%d"%(c[1],c[3],c[0],c[2],c[2]-c[0]))