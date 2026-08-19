from PIL import Image
im=Image.open('/home/tankztz/.hermes/cache/screenshots/browser_screenshot_8057e3e91fbc48a7bfe8d7c5b065cc62.png').convert('RGB')
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
        if cur and y-cur['y1']<=10:
            cur['y1']=y; cur['a']=min(cur['a'],a); cur['b']=max(cur['b'],b)
        else:
            if cur: out.append(cur)
            cur={'y0':y,'y1':y,'a':a,'b':b}
    if cur: out.append(cur)
    return out
for c in clusters():
    wdt=c['b']-c['a']
    if wdt>100 or c['y1']<600:
        print("y%d-%d: x %d..%d w=%d"%(c['y0'],c['y1'],c['a'],c['b'],wdt))