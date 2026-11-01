import sys, json, os, soundfile as sf
from kokoro_onnx import Kokoro
root = os.path.dirname(os.path.abspath(__file__)); d = os.path.join(root, 'videos', sys.argv[1])
S = json.load(open(os.path.join(d, 'script.json'))); os.makedirs(os.path.join(d, 'audio'), exist_ok=True)
k = Kokoro(os.path.join(root, 'models/kokoro-v1.0.onnx'), os.path.join(root, 'models/voices-v1.0.bin'))
out = []
for i, (t, txt) in enumerate(S['narration']):
    s, sr = k.create(txt, voice=S.get('voice', 'am_michael'), speed=1.0, lang='en-us')
    sf.write(os.path.join(d, 'audio', f'l{i:02d}.wav'), s, sr); out.append([t, len(s) / sr, txt])
    print(f'{t:5.1f} -> {t + len(s) / sr:5.1f}  {txt}')
json.dump(out, open(os.path.join(d, 'durs.json'), 'w'))
