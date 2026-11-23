# USTogether

A React + TypeScript mobile campus friendship prototype. All art is original SVG/CSS bundled with the app. No external image, font, messaging, or AI service is used.

## Run

```sh
npm install
npm run dev
```
```powershell
npm.cmd install
npm.cmd run dev
```

Open the localhost URL printed by Vite. For a production build, run `npm run build`; serve the generated `dist` folder over HTTP. Run deterministic data and movement checks with `npm test` (Node 22.6 or newer).

## Slide demo clips

Run `npm run record:demos` to launch a temporary local Vite server, seed isolated fictional browser data, and record the three Slide 17–19 interaction clips in `demo-clips/`. The script measures the `.phone` DOM container at a 2× device scale, overlays a tap indicator, maps that box to Playwright's viewport-pixel WebM, and scales the cropped result to device-pixel dimensions. It encodes PowerPoint-compatible H.264 MP4 files with FFmpeg and removes temporary WebM recordings when finished. Playwright and `ffmpeg-static` are installed as development dependencies.

## Scenario walkthrough with fictional personas

Open **Profile → Scenario walkthrough with fictional personas**. Each persona has one continuous progress bar. Playback moves automatically from Sam to Alex to Jamie, then starts over.

| Playback time | Fictional student | What the demo shows |
| --- | --- | --- |
| 0:00–0:45 | Sam, Year 2 | Sends a hello to an EMIA 2020 classmate, talks about forming a project group in Chats, and opens Meet F2F to prepare for a meeting before lecture. |
| 0:45–1:40 | Alex, Year 3 | Posts a homework question, thanks the classmate who helps, and follows up in chat before meeting in class. |
| 1:40–2:00 | Jamie, Year 1 | Receives a table-tennis quest notification, opens the quest, checks the time and venue, and accepts. |

Use the arrows to move between personas, the picker to jump to any story, or Replay to restart the active one. Drag the timeline to rewind or jump ahead in the current story. Interacting with the app pauses playback. Reduced-motion preferences start the demo paused. The desktop panel shows the active scenario and fictional profile beside the phone. Demo progress is isolated from browser storage, and exiting restores the previous session.
## Updated interactions

Student presence, invitation acceptance, and topic-based replies are simulated locally. Profile, appearance, selected sections, pending invitations, and conversations persist in browser localStorage. The prototype runs without authentication, GPS, or a messaging backend. Sound is off by default.

- Pixelify Sans is bundled locally under its OFL license (`public/licenses/Pixelify-Sans.txt`).
- Cats and dogs are four-legged animal sprites. Clothing colors customize their harnesses.
- Tap the floor to walk along a furniture-aware path. Walking uses continuous interpolation and animated steps; reduced-motion mode moves immediately.
- Student names stay **Unknown** in the lobby, nearby students list, introductions, and pending chats until a hello is accepted. Opening an introduction does not reveal a name. Accepted friends have a **Chat** button above them; accepted connections persist across refreshes.
- Throwing a hello shows pending status in the scene. Acceptance automatically opens a chat bubble above that student. The Chats tab also keeps the full conversation history.
- Each lobby has a quest board. Post an activity, venue, time, and 1–4 requested participants. The host is not counted among requested spots.
- Accepting someone else’s quest raises your level by one, once per quest. Hosting does not award a level. Full parties lock automatically.
- Hosts can invite nearby fictional students, who accept after a short simulated delay. This lets a presentation demonstrate filling a posted quest.
- Quests, participants, and levels persist in the same browser; **Reset demo** clears them along with the profile and chats.


## Lobby-first update

The lobby now has one location/lecture dropdown. Quests, students, and alerts are optional icon-triggered popups, with a close button, backdrop dismissal, and Escape support. Levels appear in the header profile chip and above characters. All profile headings use the bundled pixel font.

Course selection searches ten fictional sample courses by title or code and supports exact lecture sections. Existing classroom, library, and dorm student IDs are preserved.

New quests require at least one interest tag. In Profile → Quest alert interests, select independent notification interests or copy your profile interests. Matching, open quests in campus-wide locations and selected exact sections appear as in-app alerts; your own and full quests are excluded. Preferences and read state persist. Notifications run only while the prototype is open. **Preview a quest alert** creates a fictional matching quest for presentation testing.

The classroom contains six long desks, twelve seats, a lecture screen, and sea-facing windows. The library has full-height bookcases and study tables. The dorm is a kitchen/lounge with a sink, hob, fridge, dining table, sofa, TV, and noticeboard. Three icons in the app header open quests, students, and alerts. The Firebird is a round pixel mascot with a cream belly, large eyes, wings, and a flame tuft, inspired by the supplied reference.

Character chat renders as a bounded overlay outside the scene layout. Opening, sending, receiving, and closing messages do not resize or scroll the lobby; only message history scrolls internally. The scene fits the available lobby height, and the overlay follows viewport and keyboard size changes.


## Quest layout and zoom

Quests, Students, and Alerts are now the three top app shortcuts. The old presentation/share-looking shortcut has been removed; start the walkthrough from Profile. Quest creation replaces the popup contents with a top-aligned form. Back returns to the quest list, posting returns to the top with the new quest first, and the popup close button remains available.

The lobby starts at a larger 112% fit view. Zoom In, Zoom Out, and Fit controls change only the scene scale, keeping page layout and character movement coordinates stable. Chat repositions against the scaled character.

Quest notification banners now appear directly below the location dropdown as an overlay, without moving the lobby. Quest, Student, and Alert popups share a full-app dimmed backdrop and one clipped, rounded content surface, eliminating the inset corner artifacts.


## Lobby discussions

Campus shows only the newest post below the location selector. Hide discussions collapses the preview to a small Show discussions button; this choice stays in effect while navigating the app. Classrooms show only the selected exact lecture section; Library and Dorm show your joined communities. View all or a post preview opens the shared forum over the lobby. The duplicate scene Noticeboard shortcut has been removed. Selecting a post opens only that thread and its comments; All discussions returns to the feed. Post to classroom starts a composer for that section; campus spaces let you choose a joined community. Posts, likes, and replies share the existing browser-persisted forum store with Chats > Forums.

Posts created from the lobby return you to the room with a speech bubble above your avatar. The newest accessible post from an author present in that room appears for 15 seconds, with at most one bubble visible. Selecting it opens the original forum thread and its replies. Posts retain a stable author ID and their room; classroom posts stay tied to their exact section. Interest posts created from Chats remain in their community without broadcasting into an unrelated room. Bubbles do not duplicate posts or create a separate chat history. Other students remain fictional; there is no multi-user delivery backend.


## Fictional forum activity

Normal lobby use seeds three fictional posts per room and attempts a new random student post after about two seconds, then every 30-45 seconds while the room is open. Posts use nearby student identities and joined communities, with occasional sample replies. A 25-second quiet period after a recent room post prevents immediate interruptions. Posting pauses while another screen, chat, or popup is open. History is limited to eight fictional posts per room (or fewer when its sample topics run out), preserving user posts, replies, and likes. Rooms without an accessible community do not generate posts.



## Face-to-face conversation starters

Open a personal conversation from Chats and select **Meet f2f** in its header (also available from the character chat's people icon). The popup suggests conversation starters from shared interests and, when both students belong to the same exact lecture section, their shared class. A class topic stays visible even with many shared interests. Campus icebreakers fill remaining space when there is less in common. Suggestions are generated locally from profile data.


## Responsive phone layout

Phone screens use the full available viewport with notch and home-indicator insets, fluid side spacing, larger touch controls, and 16px form text. Short screens keep the main actions and message composer visible while content scrolls inside the app. Landscape phones show campus controls beside the room and navigation along the right edge. Character chat avoids that navigation rail. Desktop keeps its framed layout.
The desktop phone mockup is 518px wide and up to 920px tall. At narrower browser widths, it shrinks to fit or uses the full viewport.

Browser viewport checks cover widths from 320 to 440px, landscape sizes from 568?320 to 932?430, and the desktop frame in Chromium and WebKit. Real iOS and Android keyboard behavior should also be checked on devices.


## Demo and normal-use consistency checks

The walkthrough uses the same quest board, chat, face-to-face prompts, and forum replies as normal sessions. Manual interactions pause playback. Press Play to resume pending simulated hellos, replies, and quest invitations. Introductions keep the hello/chat action visible while their details scroll, and share Escape dismissal and keyboard focus handling with other popups. Exiting restores the previous session, discussion visibility, message drafts, and pending live replies; demo invitations cannot modify saved real quests.

Run `npm test` for model checks and `npm run test:browser` for Chromium/WebKit interaction checks. The browser suite requires Google Chrome and Playwright WebKit (`npx playwright install webkit`). It uses a separate local server on port 5174 and covers all three scenarios, normal onboarding and matching, chats, quests, forums, pause/resume, session restoration, and phone/desktop dialog layout. Browser checks use isolated local sample data.


## Preset conversation library

Chat and Meet f2f share 136 locally written starters and matching simulated replies: four for each of the 20 interests, four for each of the ten sample courses (using the exact shared lecture section), and 16 across campus life, study habits, weekend plans, and meetup ideas. Suggested sets rotate with **More ideas**, keeping shared interests and a shared class first. The topic picker also lets students explore other interests without labeling them as shared.

In personal chat, select **More ideas**; in character chat, use the sparkle button. **Send this starter** sends the selected question and gets its matching preset reply. **Meet f2f** uses the same topic library for in-person conversation and does not send a message. Both normal use and demo playback share these components and data. No external AI service is involved.
