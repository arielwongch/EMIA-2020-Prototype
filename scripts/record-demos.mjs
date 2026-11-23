import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import {createServer} from 'vite';
import {spawn} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(root, 'demo-clips');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'ustogether-recordings-'));
const viewport = {width: 1280, height: 1000};
const deviceScaleFactor = 2;
// Playwright's WebM frames use viewport CSS pixels; the MP4 is scaled to device pixels after cropping.
const recordingVideoSize = {...viewport};
const baseUrl = 'http://127.0.0.1:4173/EMIA-2020-Prototype/';
const storageKey = 'ustogether-v1';
const profile = {
  name: 'Riley Chen',
  intro: 'Looking for good conversations and new campus friends.',
  interests: ['Hiking', 'Photography', 'Coffee'],
  classes: ['COMP 1021 · L1'],
  avatar: {
    type: 'Firebird',
    color: '#c9473d',
    clothes: '#709988',
    accessory: 'Scarf',
    item: 'Coffee',
    hair: 'Short',
    skin: '#e7b58c',
  },
};

if (!ffmpegPath) {
  throw new Error('ffmpeg-static did not provide an FFmpeg executable.');
}

function acceptedThread(messages = []) {
  return {status: 'accepted', acceptedAt: Date.now(), messages};
}

function seedState({location, peerId, messages = [], forumStore = {}, game}) {
  return {
    ready: true,
    location,
    profile,
    prefs: {enabled: false, interests: []},
    threads: {[peerId]: acceptedThread(messages)},
    forumStore,
    ...(game ? {game} : {}),
  };
}

const now = Date.now();
const forumStore = {
  'interest:Hiking': [{
    id: 'demo-hiking-discussion',
    title: 'A short hike after class?',
    text: 'I am planning an easy coastal trail this week. Has anyone found a route with a good sunset view?',
    author: 'Noah',
    authorId: 'p6-0',
    createdAt: now - 60_000,
    likedBy: [],
    replies: [
      {author: 'Luna', text: 'The path by the seafront is lovely near sunset.'},
      {author: 'Ethan', text: 'I would be up for joining after lecture.'},
    ],
  }],
};

const questsGame = {
  joined: [],
  quests: [{
    id: 'study-buddy',
    lobby: 'COMP 1021 · L1',
    hostId: 'p0-0',
    hostName: 'Sophie',
    title: 'Design a study sprint',
    place: 'Library · Learning Commons',
    when: 'Today · 4:30 PM',
    details: 'Review the lecture examples together before class.',
    capacity: 2,
    participants: ['p0-2'],
    interests: ['Photography'],
  }],
};

function wait(page, milliseconds) {
  return page.waitForTimeout(milliseconds);
}

function injectTapIndicator(page) {
  return page.evaluate(() => {
    const phone = document.querySelector('.phone');
    if (!(phone instanceof HTMLElement)) throw new Error('The .phone screen container was not found.');

    const style = document.createElement('style');
    style.textContent = `
      .phone, .phone * { scrollbar-width: none !important; }
      .phone ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      .phone .demo-strip, .phone .debug-overlay, .phone [data-debug-overlay] { display: none !important; }
      .demo-tap-pointer { position: absolute; z-index: 9999; left: 0; top: 0; width: 0; height: 0; display: none; pointer-events: none; }
      .demo-tap-dot { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border: 2px solid #345b44; border-radius: 50%; background: #fffef4d9; box-shadow: 0 1px 5px #273c2c66; }
      .demo-tap-ripple { position: absolute; left: -20px; top: -20px; width: 40px; height: 40px; border: 2px solid #d19b54; border-radius: 50%; opacity: 0; transform: scale(.35); }
      .demo-tap-pointer.is-tapping .demo-tap-ripple { animation: demo-tap-ripple .55s ease-out; }
      @keyframes demo-tap-ripple { 0% { opacity: .8; transform: scale(.35); } 100% { opacity: 0; transform: scale(1.25); } }
    `;
    document.head.append(style);

    const pointer = document.createElement('div');
    pointer.className = 'demo-tap-pointer';
    pointer.innerHTML = '<span class="demo-tap-dot"></span><span class="demo-tap-ripple"></span>';
    phone.append(pointer);

    const position = event => {
      const bounds = phone.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const inside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;
      pointer.style.display = inside ? 'block' : 'none';
      if (inside) pointer.style.transform = `translate(${x}px, ${y}px)`;
    };
    document.addEventListener('pointermove', position, {passive: true});
    document.addEventListener('pointerdown', event => {
      position(event);
      if (phone.contains(event.target)) pointer.classList.add('is-tapping');
    }, {passive: true});
    document.addEventListener('pointerup', () => pointer.classList.remove('is-tapping'), {passive: true});
  });
}

function evenPixel(value) {
  return Math.round(value / 2) * 2;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {cwd: root, windowsHide: true});
    let output = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(output);
      else reject(new Error(`FFmpeg exited with code ${code}.\n${output}`));
    });
  });
}

async function inspectVideo(file) {
  const report = await runFfmpeg(['-hide_banner', '-i', file, '-f', 'null', '-']);
  const stream = report.match(/Stream #\d+:\d+.*Video: ([^\r\n]+)/);
  const durationText = report.match(/Duration: (\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const dimensions = stream?.[1].match(/\b(\d{2,5})x(\d{2,5})\b/);
  assert(stream, `No video stream found in ${file}`);
  assert(dimensions, `No video dimensions found in ${file}`);
  assert(durationText, `No duration found in ${file}`);
  const [, hours, minutes, seconds] = durationText;
  return {
    stream: stream[1],
    width: Number(dimensions[1]),
    height: Number(dimensions[2]),
    duration: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds),
  };
}

async function recordClip(context, {filename, seed, prepare, flow, duration, finalHold}) {
  const startedAt = Date.now();
  const page = await context.newPage();
  const video = page.video();
  assert(video, `Playwright video recording did not start for ${filename}`);

  await page.addInitScript(({key, value}) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {key: storageKey, value: seed});

  let rawVideo;
  let pageClosed = false;
  let trimOffsetMs = 0;
  try {
    await page.goto(baseUrl, {waitUntil: 'domcontentloaded'});
    await page.locator('.phone').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await injectTapIndicator(page);
    await prepare(page);
    await page.evaluate(() => {
      const pointer = document.querySelector('.demo-tap-pointer');
      pointer?.classList.remove('is-tapping');
      if (pointer instanceof HTMLElement) pointer.style.display = 'none';
    });
    trimOffsetMs = Date.now() - startedAt;
    const interactionStartedAt = Date.now();

    const phone = page.locator('.phone');
    // Keep the raw crop origin even without including a desktop-background pixel.
    await phone.evaluate(element => { element.style.left = '1px'; });
    const bounds = await phone.boundingBox();
    assert(bounds, 'Could not measure the .phone container.');
    const actualScale = await page.evaluate(() => window.devicePixelRatio);
    assert.equal(actualScale, deviceScaleFactor, 'Chromium did not use the requested device scale factor.');
    const outputCrop = {
      x: evenPixel(bounds.x * actualScale),
      y: evenPixel(bounds.y * actualScale),
      width: evenPixel(bounds.width * actualScale),
      height: evenPixel(bounds.height * actualScale),
    };
    const recordingScale = {
      x: recordingVideoSize.width / viewport.width,
      y: recordingVideoSize.height / viewport.height,
    };
    const sourceCrop = {
      x: evenPixel(bounds.x * recordingScale.x),
      y: evenPixel(bounds.y * recordingScale.y),
      width: evenPixel(bounds.width * recordingScale.x),
      height: evenPixel(bounds.height * recordingScale.y),
    };
    console.log(`${filename}: .phone CSS bounds ${JSON.stringify(bounds)}; 2x crop ${JSON.stringify(outputCrop)}; raw WebM crop ${JSON.stringify(sourceCrop)}.`);

    await flow(page);
    const interactionTime = Date.now() - interactionStartedAt;
    const finalHoldTime = Math.max(finalHold, duration.target * 1000 - interactionTime);
    console.log(`${filename}: paced interactions ${interactionTime}ms; final hold ${finalHoldTime}ms.`);
    await wait(page, finalHoldTime);
    await page.close();
    pageClosed = true;
    rawVideo = await video.path();

    const rawInfo = await inspectVideo(rawVideo);
    console.log(`${filename}: raw video ${rawInfo.duration.toFixed(2)}s; trimmed ${ (trimOffsetMs / 1000).toFixed(2)}s.`);
    assert.equal(rawInfo.width, recordingVideoSize.width, 'Raw Playwright video width did not match the viewport.');
    assert.equal(rawInfo.height, recordingVideoSize.height, 'Raw Playwright video height did not match the viewport.');
    assert(sourceCrop.width > 0 && sourceCrop.height > 0, 'Phone crop dimensions must be positive.');
    assert(sourceCrop.x + sourceCrop.width <= rawInfo.width, 'Phone crop extends beyond the raw video width.');
    assert(sourceCrop.y + sourceCrop.height <= rawInfo.height, 'Phone crop extends beyond the raw video height.');

    const output = path.join(outputDirectory, filename);
    await runFfmpeg([
      '-y',
      '-i', rawVideo,
      '-ss', (trimOffsetMs / 1000).toFixed(3),
      '-t', (duration.max - 0.1).toFixed(2),
      '-vf', `crop=${sourceCrop.width}:${sourceCrop.height}:${sourceCrop.x}:${sourceCrop.y},scale=${outputCrop.width}:${outputCrop.height}`,
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-level', '4.1',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-crf', '20',
      '-movflags', '+faststart',
      '-an',
      output,
    ]);

    const info = await inspectVideo(output);
    assert.match(info.stream, /\bh264\b/i, `${filename} is not H.264.`);
    assert.match(info.stream, /\byuv420p\b/i, `${filename} is not yuv420p.`);
    assert.equal(info.width, outputCrop.width, `${filename} width is not the 2x measured phone width.`);
    assert.equal(info.height, outputCrop.height, `${filename} height is not the 2x measured phone height.`);
    assert(info.duration >= duration.min && info.duration <= duration.max,
      `${filename} duration ${info.duration.toFixed(2)}s is outside ${duration.min}-${duration.max}s.`);
    console.log(`Created ${filename}: ${info.width}x${info.height}, ${info.duration.toFixed(2)}s, ${info.stream}.`);
  } finally {
    if (!pageClosed) await page.close();
    if (rawVideo) await rm(rawVideo, {force: true});
  }
}

let server;
let browser;
let recordingContext;
try {
  await mkdir(outputDirectory, {recursive: true});
  server = await createServer({
    server: {host: '127.0.0.1', port: 4173, strictPort: true},
    logLevel: 'error',
  });
  await server.listen();
  browser = await chromium.launch({headless: true});
  recordingContext = await browser.newContext({
    viewport,
    deviceScaleFactor,
    reducedMotion: 'reduce',
    recordVideo: {dir: temporaryDirectory, size: recordingVideoSize},
  });
  const warmupPage = await recordingContext.newPage();
  await warmupPage.goto(baseUrl, {waitUntil: 'domcontentloaded'});
  await warmupPage.locator('.phone').waitFor();
  await warmupPage.evaluate(() => document.fonts.ready);
  await warmupPage.close();

  await recordClip(recordingContext, {
    filename: 'slide17-icebreakers.mp4',
    seed: seedState({location: 'Library', peerId: 'p6-0'}),
    duration: {min: 10, max: 14, target: 12},
    finalHold: 2500,
    prepare: async page => {
      await page.locator('nav').getByRole('button', {name: 'Chats', exact: true}).click();
      await page.locator('.conversation-row').filter({hasText: 'Noah'}).click();
    },
    flow: async page => {
      await wait(page, 1500);

      await page.getByRole('button', {name: 'More ideas', exact: true}).click();
      const ideas = page.getByRole('dialog', {name: 'Conversation ideas with Noah'});
      await ideas.waitFor();
      await wait(page, 1000);
      await ideas.getByRole('combobox', {name: 'Conversation topic'}).selectOption('interest:Photography');
      await wait(page, 2000);

      const question = await ideas.locator('.topic-card p').first().innerText();
      const draftButton = ideas.getByRole('button', {name: 'Edit and send'}).first();
      await draftButton.click();
      const message = page.getByRole('textbox', {name: 'Message'});
      await message.waitFor();
      await wait(page, 1500);

      const editedQuestion = question.replace(/\bgot you into photography\b/i, 'made you love photos');
      assert.notEqual(editedQuestion, question, 'The selected photo prompt did not contain editable wording.');
      await message.click();
      await message.press('Control+A');
      await message.type(editedQuestion, {delay: 50});
      await wait(page, 1000);
      await page.getByRole('button', {name: 'Send message', exact: true}).click();
      await page.getByText(editedQuestion, {exact: true}).waitFor();
    },
  });

  await recordClip(recordingContext, {
    filename: 'slide18-lobby-forum.mp4',
    seed: seedState({
      location: 'Library',
      peerId: 'p6-0',
      messages: [
        {text: 'I saw your Hiking Circle post. The sunset trail sounds great.', own: true},
        {text: 'Thanks! I can share the route when we meet.', own: false},
      ],
      forumStore,
    }),
    duration: {min: 10, max: 14, target: 11.2},
    finalHold: 2500,
    prepare: async page => {
      await page.locator('nav').getByRole('button', {name: 'Chats', exact: true}).click();
      await page.getByRole('tab', {name: 'Forums', exact: true}).click();
    },
    flow: async page => {
      await wait(page, 2000);
      await page.getByRole('combobox', {name: 'Filter forum community'}).selectOption('interest:Hiking');
      await page.getByRole('heading', {name: 'Hiking Circle', exact: true}).waitFor();
      await wait(page, 1000);
      const discussion = page.locator('.social-post').filter({hasText: 'A short hike after class?'});
      await discussion.getByRole('button', {name: 'Show comments'}).click();
      await discussion.getByRole('region', {name: 'Post comments'}).waitFor();
      await wait(page, 2500);

      await discussion.locator('.forum-author-name').click();
      const introduction = page.getByRole('dialog', {name: 'Meet Noah'});
      await introduction.waitFor();
      await wait(page, 1000);
      await introduction.getByRole('button', {name: 'Message', exact: true}).click();
      await page.locator('.chat-screen h2').getByText('Noah', {exact: true}).waitFor();
      await wait(page, 1500);
    },
  });

  await recordClip(recordingContext, {
    filename: 'slide19-quests-meet-f2f.mp4',
    seed: seedState({
      location: 'COMP 1021 · L1',
      peerId: 'p0-0',
      messages: [
        {text: 'Are you reviewing the lecture examples today?', own: true},
        {text: 'Yes, I will be at the Learning Commons before class.', own: false},
      ],
      game: questsGame,
    }),
    duration: {min: 12, max: 15, target: 13},
    finalHold: 3500,
    prepare: async page => {
      const questButton = page.getByRole('button', {name: 'Open lobby quests', exact: true});
      await questButton.click();
      await page.locator('[data-quest-id="study-buddy"]').waitFor();
    },
    flow: async page => {
      const quest = page.locator('[data-quest-id="study-buddy"]');
      await wait(page, 2000);

      await quest.getByRole('button', {name: 'Accept quest', exact: true}).click();
      await quest.getByText(/Joined/).waitFor();
      await wait(page, 2000);
      await page.getByRole('button', {name: 'Close lobby quests', exact: true}).click();
      await wait(page, 1000);

      await page.locator('nav').getByRole('button', {name: 'Chats', exact: true}).click();
      await wait(page, 1000);
      await page.locator('.conversation-row').filter({hasText: 'Sophie'}).click();
      await wait(page, 1000);
      await page.getByRole('button', {name: 'Meet face to face', exact: true}).click();
      const meet = page.getByRole('dialog', {name: 'Meet Sophie face to face'});
      await meet.waitFor();
      await wait(page, 1000);
      await meet.getByRole('combobox', {name: 'Conversation topic'}).selectOption('class:COMP 1021 · L1');
      await meet.getByText('These are conversation starters only; no invitation is sent.', {exact: true}).waitFor();
      await meet.locator('.topic-card').first().waitFor();
    },
  });
} finally {
  if (recordingContext) await recordingContext.close();
  if (browser) await browser.close();
  if (server) await server.close();
  await rm(temporaryDirectory, {recursive: true, force: true});
}
