import sys, os, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
D = os.path.dirname(os.path.abspath(__file__)); SR = 48000; DUR = 60.0; N = int(SR * DUR); tt = np.arange(N) / SR
rng = np.random.default_rng(3)
def filt(x, kind, f, o=2): return sosfilt(butter(o, f, btype=kind, fs=SR, output='sos'), x)
def env(pts): ts, vs = zip(*pts); return np.interp(tt, ts, vs)
def ss(a, b, x): k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)
def place(buf, sig, t0, g=1.0):
    i = int(t0 * SR); j = min(N, i + sig.shape[-1])
    if j > i: buf[..., i:j] += g * sig[..., :j - i]
def st(x): return np.vstack([x, x])
def pink(n):
    f = np.fft.rfft(rng.standard_normal(n)); k = np.arange(len(f)); k[0] = 1; return np.fft.irfft(f / np.sqrt(k), n) * 8
def brown(n): b = np.cumsum(rng.standard_normal(n)); b -= filt(b, 'low', 2); return b / (np.abs(b).max() + 1e-9)
def sweep(f0, f1, d, c=1.0): t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * (t / d) ** c) / SR)
def dec(d, k): return np.exp(-np.arange(int(d * SR)) / SR * k)
bed = np.zeros((2, N)); hits = np.zeros((2, N))
# --- recipes ---
def ambience(points, lp=500, lvl=.05):
    e = env(points)
    for ch in range(2): bed[ch] += filt(pink(N), 'low', lp) * lvl * (1 + .4 * np.sin(2 * np.pi * .13 * tt + ch)) * e
def birds(t0s):
    for t0 in t0s:
        for k in range(rng.integers(2, 4)):
            d = rng.uniform(.05, .11); s = sweep(rng.uniform(2800, 4200), rng.uniform(3500, 5500), d) * np.hanning(int(d * SR)); p = rng.uniform(.2, .8)
            place(bed, np.vstack([s * (1 - p), s * p]), t0 + k * rng.uniform(.09, .16), .035)
def tick(t0, g=.12): place(hits, st(np.sin(2 * np.pi * 1900 * np.arange(int(.03 * SR)) / SR) * dec(.03, 160)), t0, g)
def riser(t0, d=1.2, g=.12): place(bed, st(filt(rng.standard_normal(int(d * SR)), 'band', [300, 5000]) * np.linspace(0, 1, int(d * SR)) ** 2.5), t0, g)
def boom(t0, f0=85, f1=28, d=2.2, g=.55, lp=300):
    s = sweep(f0, f1, d, .5) * dec(d, 2.2) + filt(rng.standard_normal(int(d * SR)), 'low', lp) * dec(d, 5) * .6; place(hits, st(np.tanh(s * 1.6)), t0, g)
def bell(t0, g=.08, base=110):
    t = np.arange(int(6 * SR)) / SR; place(hits, st(sum(a * np.sin(2 * np.pi * base * m * t) * np.exp(-t * k) for m, a, k in [(1, 1, .7), (2.76, .5, 1.1), (5.4, .3, 1.8), (8.93, .15, 2.6)])), t0, g)
def whoosh(t0, d=1.4, g=.14): w = filt(rng.standard_normal(int(d * SR)), 'band', [200, 3000]) * np.hanning(int(d * SR)); place(bed, np.vstack([w, np.roll(w, 900)]), t0, g)
def drone(points, fs=(55, 82.4, 110.3), lvl=.05): bed[:] += sum(np.sin(2 * np.pi * f * tt) / (i + 1) for i, f in enumerate(fs)) * lvl * env(points)
def shimmer(points, lvl=.022): bed[:] += sum(np.sin(2 * np.pi * f * tt) / (i + 1) for i, f in enumerate([660, 990, 1320, 1980])) * (1 + .5 * np.sin(2 * np.pi * 5 * tt)) * lvl * env(points)
def rumble(envelope, rms=.095):
    r = np.vstack([filt(brown(N), 'low', 110), filt(brown(N), 'low', 110)]); r /= np.sqrt((r ** 2).mean()) / rms
    bed[:] += r * (.6 + .4 * np.abs(np.sin(2 * np.pi * .7 * tt) * np.sin(2 * np.pi * .23 * tt + 1))) * envelope
def crack(t0, g=.25):
    n = int(.35 * SR); c = rng.standard_normal(n) * (rng.random(n) < .02) * 4 + rng.standard_normal(n) * .3; c = filt(c, 'high', 900) * dec(.35, 9); c /= np.abs(c).max(); p = rng.uniform(.25, .75)
    place(hits, np.vstack([c * (1 - p), c * p]), t0, g); th = filt(rng.standard_normal(int(.5 * SR)), 'low', 150) * dec(.5, 7); place(hits, st(th / np.abs(th).max()), t0 + .02, .35)
def pop(t0, g=.2): place(hits, st(sweep(900, 1500, .07) * np.hanning(int(.07 * SR))), t0, g)
# --- EVENTS (edit per video) ---
ambience([(0, 0), (.4, 1), (7.8, 1), (8, .25), (16, .2), (16.4, 0), (28, 0), (28.6, .9), (40, .5), (52, 0), (60, 0)])
birds(list(rng.uniform(.5, 7.5, 9)))
for s in [3, 4, 5, 6, 7]: tick(s)
riser(6.8); boom(8.0)
drone([(0, 0), (8, 0), (9, 1), (15.6, 1), (16.3, 0), (60, 0)])
shimmer([(0, 0), (16.2, 0), (17, 1), (23.6, 1.4), (24, 0), (60, 0)])
whoosh(23.2); [boom(24.2 + k * 1.82, 60, 40, 1.4, .18) for k in range(3)]
riser(27.0, 1.0, .16); boom(28.0, 70, 24, 3.5, .8, 900); bell(28.05, .07)
rumble(ss(33, 41, tt) * .45 + ss(41, 50, tt) * .55)
for c in range(16): crack(38.5 + c * .55, .22 + .012 * c)
# --- end card, fade, narration, ducking (keep) ---
endpad = st(sum(np.sin(2 * np.pi * f * tt) for f in [220, 261.6, 329.6, 440]) * .02) * env([(0, 0), (52.2, 0), (53.5, 1), (58.8, 1), (59.9, 0), (60, 0)])
pop(57.3)
hits = np.tanh(hits * 1.1) / 1.1
fade = 1 - ss(51.2, 52.0, tt); bed *= fade; hits[:, :int(52.2 * SR)] *= fade[:int(52.2 * SR)]; bed += endpad
voice = np.zeros(N)
for i, (t0, d, txt) in enumerate(json.load(open(os.path.join(D, 'durs.json')))):
    a, sr = sf.read(os.path.join(D, 'audio', f'l{i:02d}.wav'), dtype='float64'); a = resample_poly(a, SR, sr); a = filt(a / (np.abs(a).max() + 1e-9) * .8, 'high', 70); place(voice, a, t0)
e = np.clip(filt(np.abs(voice), 'low', 8) / .08, 0, 1)
mix = bed * (1 - .6 * e) + hits * (1 - .3 * e) + st(voice)
pk = np.abs(mix).max(); mix *= min(1, .95 / pk)
sf.write(os.path.join(D, 'mix.wav'), mix.T, SR); print('mix ok, peak', round(pk, 2))
