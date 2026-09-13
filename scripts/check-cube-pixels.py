from pathlib import Path
from PIL import Image, ImageChops
import json

failures=[]
bounds={str(item['width']):item for item in json.loads(Path('.runtime/cube-framing/bounds.json').read_text())}
for path in Path('.runtime/cube-framing').glob('*.png'):
    image=Image.open(path).convert('RGB')
    # The cube's core/stickers differ strongly from the blue backdrop. Ignore
    # its faint ground shadow when checking whether the object touches an edge.
    delta=ImageChops.difference(image,Image.new('RGB',image.size,(0,161,255)))
    channels=delta.split()
    mask=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),channels[2]).point(lambda p:255 if p>75 else 0)
    box=mask.getbbox()
    if not box:
        failures.append((path.name,'missing cube'))
    elif min(box[0],box[1],image.width-box[2],image.height-box[3])<5:
        failures.append((path.name,box,image.size))
    if box:
        frame=bounds[path.name.split('-')[0]]
        if frame['top']+box[1]<max(frame['wordmarkBottom'],frame['headerBottom']) or frame['left']+box[0]<frame['copyRight']:
            failures.append((path.name,'cube overlaps the title, navigation or body copy'))
print(f'Checked {len(list(Path(".runtime/cube-framing").glob("*.png")))} rendered frames')
if failures:
    raise AssertionError(failures)
print('PASS: every cube silhouette has clear space on all four canvas edges')
