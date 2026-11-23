import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,ChevronRight,Compass,Heart,House,MessageCircle,Send,CircleUserRound,UserRoundPen,UsersRound,Handshake,Bell,Presentation,Trophy,Sparkles,Users,Volume2,VolumeX,X} from 'lucide-react';
import Avatar from './Avatar';import Scene from './Scene';
import {defaultAvatar,demo,eligible,interests,peers,recommended,reply,shared,starters,peerName,advanceHellos,type Profile,type Peer,type Thread} from './model';
import QuestBoard from './QuestBoard';
import DemoWalkthrough from './DemoWalkthrough';
import DemoScenarioPanel from './DemoScenarioPanel';
import {alexThread,demoFrame,demoReplyDelay,demoScenarios,helloDelay,tableTennisId,walkthroughTitle,type ForumDraft} from './demoPlayback';
import Popup,{useDialogFocus} from './Popup';
import ConversationIdeas from './ConversationIdeas';
import LobbyForum from './LobbyForum';
import Forums,{type ForumAutomation} from './ForumHub';
import {addForumReply,roomAnnouncement,seedRoomPosts,simulateRoomPost,type ForumStore} from './forums';
import ClassPicker from './ClassPicker';
import {AlertSettings,AlertList} from './QuestAlerts';
import {matchingQuests,type AlertPreferences} from './alerts';
import {initialGame,joinQuest,type Game,type Quest} from './quests';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './style.css';
const KEY='ustogether-v1';
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
function App(){
useEffect(()=>{
 const viewport=window.visualViewport;
 const fitViewport=()=>{
  if(!viewport||viewport.scale===1)document.documentElement.style.setProperty('--mobile-app-height',`${viewport?.height??window.innerHeight}px`);
 };
 fitViewport();
 window.addEventListener('resize',fitViewport);
 viewport?.addEventListener('resize',fitViewport);
 return ()=>{window.removeEventListener('resize',fitViewport);viewport?.removeEventListener('resize',fitViewport);document.documentElement.style.removeProperty('--mobile-app-height');};
},[]);
const [saved]=useState(read);const [profile,setProfile]=useState<Profile>(saved?.profile||{...demo,name:'',intro:'',interests:[],classes:[],avatar:{...defaultAvatar}});const [ready,setReady]=useState(!!saved?.ready);const [step,setStep]=useState(0);const [tab,setTab]=useState('Campus');const [location,setLocation]=useState(saved?.location||'Library');const [threads,setThreads]=useState<Record<string,Thread>>(saved?.threads||{});const [peer,setPeer]=useState<Peer|null>(null);const [forumPeer,setForumPeer]=useState(false);const [chat,setChat]=useState<Peer|null>(null);const [editing,setEditing]=useState(false);const [orb,setOrb]=useState(false);const [text,setText]=useState('');const [typing,setTyping]=useState<string|null>(null);const [sound,setSound]=useState(false);const [reset,setReset]=useState(false);const bottom=useRef<HTMLDivElement>(null);
const [game,setGame]=useState<Game>(saved?.game?{...saved.game,quests:[...saved.game.quests,...initialGame.quests.filter(q=>!saved.game.quests.some((old:Quest)=>old.id===q.id))]}:initialGame),[worldChat,setWorldChat]=useState<Peer|null>(null),[helloTarget,setHelloTarget]=useState<string|null>(null),[levelToast,setLevelToast]=useState(false);
const level=game.joined.length+1;
const [forumStore,setForumStore]=useState<ForumStore>(saved?.forumStore||{}),[chatTab,setChatTab]=useState('Direct'),[meetPeer,setMeetPeer]=useState<Peer|null>(null),[ideasMode,setIdeasMode]=useState<'meet'|'chat'>('meet'),[forumAutomation,setForumAutomation]=useState<ForumAutomation|null>(null);
const [forumHidden,setForumHidden]=useState(false);
const introPanel=useRef<HTMLElement>(null),introClose=useRef<HTMLButtonElement>(null);
useDialogFocus(introPanel,introClose,()=>setPeer(null),!!peer);
const [lobbyForum,setLobbyForum]=useState<{community:string|null;post?:string;compose?:boolean;draft?:ForumDraft}|null>(null);
const openLobbyForum=(community:string|null,post?:string,compose=false)=>{setWorldChat(null);setPanel(null);setLobbyForum({community,post,compose});};
const editSnapshot=useRef<Profile|null>(null);
const startEdit=(page:number)=>{editSnapshot.current=structuredClone(profile);setEditing(true);setStep(page);setClassQuery('');};
const cancelEdit=()=>{if(editSnapshot.current)setProfile(editSnapshot.current);editSnapshot.current=null;setEditing(false);};
const finishProfile=()=>{if(editing){editSnapshot.current=null;setEditing(false);return;}if(step<3){setStep(step+1);return;}setReady(true);setTab('Campus');setLocation(profile.classes[0]||'Library');if(!prefs.interests.length)setPrefs(p=>({...p,interests:[...profile.interests]}));};
const [panel,setPanel]=useState<'quests'|'students'|'alerts'|'alert-settings'|null>(null),[prefs,setPrefs]=useState<AlertPreferences>(saved?.prefs||{enabled:true,interests:saved?.profile?.interests||[]}),[seenAlerts,setSeenAlerts]=useState<string[]>(saved?.seenAlerts||[]),[questToast,setQuestToast]=useState<Quest|null>(null),[demoActive,setDemoActive]=useState(false),[scenarioIndex,setScenarioIndex]=useState(0),[demoPlaying,setDemoPlaying]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches),[demoReplay,setDemoReplay]=useState(0),[demoTime,setDemoTime]=useState(0),[classQuery,setClassQuery]=useState('');
const scenario=demoScenarios[scenarioIndex];
const [demoScrubbing,setDemoScrubbing]=useState(false);
const demoAdvancing=demoPlaying&&!demoScrubbing;
// Seed history once per room, then occasionally let a nearby fictional student post.
useEffect(()=>{if(!ready||editing||demoActive)return;setForumStore(store=>seedRoomPosts(store,profile,location,eligible(location)));},[ready,editing,demoActive,location,profile.interests.join('|'),profile.classes.join('|')]);
useEffect(()=>{
 if(!ready||editing||demoActive||tab!=='Campus'||panel||lobbyForum||chat||worldChat||meetPeer)return;
 let timer:ReturnType<typeof setTimeout>,cancelled=false;
 const publish=()=>{if(cancelled)return;if(document.visibilityState==='visible')setForumStore(store=>{
  const recent=Object.values(store).flat().some(post=>post.room===location&&post.createdAt&&Date.now()-post.createdAt<25_000);
  return recent?store:simulateRoomPost(store,profile,location,eligible(location));
 });timer=setTimeout(publish,30_000+Math.random()*15_000);};
 timer=setTimeout(publish,2200);
 return()=>{cancelled=true;clearTimeout(timer);};
},[ready,editing,demoActive,tab,location,panel,lobbyForum,chat,worldChat,meetPeer,profile.interests.join('|'),profile.classes.join('|')]);
const alerts=matchingQuests(game.quests,prefs,profile.classes),unread=alerts.filter(q=>!seenAlerts.includes(q.id)),alertIds=alerts.map(q=>q.id).join('|');
useEffect(()=>{const fresh=alerts.find(q=>!seenAlerts.includes(q.id));if(fresh)setQuestToast(fresh);},[alertIds]);
useEffect(()=>{if(!prefs.enabled)setQuestToast(null);},[prefs.enabled]);
useEffect(()=>{if(!questToast||demoActive)return;const timer=setTimeout(()=>setQuestToast(null),5000);return()=>clearTimeout(timer);},[questToast,demoActive]);
const previewAlert=()=>{const topic=prefs.interests[0];if(!topic)return;const p=eligible(location)[0];const q:Quest={id:crypto.randomUUID(),lobby:location,hostId:p.id,hostName:p.name,title:`${topic} meetup`,place:location==='Library'?'Library entrance':location==='Dorm common area'?'Common room':'Outside the classroom',when:'Today · 5:00 PM',details:'A sample quest for the notification demo.',capacity:3,participants:[],interests:[topic]};setGame(g=>({...g,quests:[q,...g.quests]}));setPanel('alerts');};
const selectAlert=(q:Quest)=>{setSeenAlerts(ids=>ids.includes(q.id)?ids:[...ids,q.id]);setQuestToast(null);setLocation(q.lobby);setPanel('quests');setTab('Campus');setChat(null);};
function captureSession(){return {profile,ready,step,tab,location,threads,game,prefs,seenAlerts,sound,editing,peer,chat,worldChat,panel,classQuery,forumStore,chatTab,forumHidden,text,typing,helloTarget,orb,levelToast,questToast,reset,lobbyForum,meetPeer,ideasMode};}
const liveSnapshot=useRef<ReturnType<typeof captureSession>|null>(null),firedCues=useRef(new Set<number>()),virtualJobs=useRef<{at:number;run:()=>void}[]>([]),realJobs=useRef(new Map<ReturnType<typeof setTimeout>,{run:()=>void;due:number}>()),suspendedJobs=useRef<{run:()=>void;remaining:number}[]>([]),demoEpoch=useRef(Date.now()),seekQuestFocus=useRef(false);
const playback=useRef({active:demoActive,playing:demoAdvancing,time:demoTime});playback.current={active:demoActive,playing:demoAdvancing,time:demoTime};
const cancelJobs=()=>{virtualJobs.current=[];for(const job of realJobs.current.keys())clearTimeout(job);realJobs.current.clear();};
const scheduleReal=(run:()=>void,delay:number)=>{const timer=setTimeout(()=>{realJobs.current.delete(timer);run();},delay);realJobs.current.set(timer,{run,due:Date.now()+delay});};
const suspendRealJobs=()=>{const now=Date.now();suspendedJobs.current=[...realJobs.current.values()].map(job=>({run:job.run,remaining:Math.max(0,job.due-now)}));for(const timer of realJobs.current.keys())clearTimeout(timer);realJobs.current.clear();};
const later=(run:()=>void,delay:number)=>{if(playback.current.active){virtualJobs.current.push({at:playback.current.time+delay,run});}else scheduleReal(run,delay);};
const focusQuestCard=(id:string)=>document.querySelector(`.phone[data-session="demo"] [data-quest-id="${id}"]`)?.scrollIntoView({block:'nearest',behavior:'auto'});
const finishChatReply=(id:string,message:string)=>{
 setThreads(old=>{
  const thread=old[id];
  return thread?.status==='accepted'?{...old,[id]:{...thread,messages:[...thread.messages,{text:message,own:false}]}}:old;
 });
 setTyping(null);
 ping();
};
const resetScenario=(index:number,time=0)=>{
 cancelJobs();
 if(time===0||index!==scenarioIndex)demoEpoch.current=Date.now();
 const story=demoScenarios[index],frame=demoFrame(story,initialGame,time,demoEpoch.current);
 const {target,view}=frame;
 firedCues.current=new Set(story.events.flatMap((cue,i)=>cue.at<=time?[i]:[]));
 seekQuestFocus.current=frame.focusQuest;
 const pendingHello=frame.threads[target.id]?.status==='pending';
 setScenarioIndex(index);setProfile(frame.profile);setReady(true);setStep(0);setEditing(false);
 setTab(view==='chat-list'||view==='chat'||view==='meet'?'Chats':'Campus');
 setLocation(frame.location);setThreads(frame.threads);setGame(frame.game);
 setPrefs({enabled:!!frame.notification,interests:frame.notification?['Table tennis']:[]});
 setSeenAlerts(frame.alertRead?[tableTennisId]:[]);
 setPeer(view==='intro'?target:null);setChat(view==='chat'||view==='meet'?target:null);
 setWorldChat(view==='world-chat'?target:null);setPanel(view==='quests'?'quests':null);
 setText(frame.draft);setTyping(frame.pendingReply?target.id:null);setHelloTarget(pendingHello?target.id:null);
 setOrb(frame.orbUntil>time);setLevelToast(frame.flashUntil>time);setQuestToast(frame.alert);
 setReset(false);setClassQuery('');setForumStore(frame.forumStore);setChatTab('Direct');
 setMeetPeer(view==='meet'?target:null);setIdeasMode('meet');
 setLobbyForum(view==='compose'||view==='thread'?{
  community:`class:${frame.location}`,post:view==='thread'?alexThread:undefined,compose:view==='compose',draft:frame.forumDraft,
 }:null);
 setForumAutomation(null);setSound(false);setForumHidden(false);
 setDemoTime(time);setDemoReplay(n=>n+1);
 if(frame.pendingReply){
  const {at,text}=frame.pendingReply;
  virtualJobs.current.push({at,run:()=>finishChatReply(target.id,text)});
 }
 if(frame.orbUntil>time)virtualJobs.current.push({at:frame.orbUntil,run:()=>setOrb(false)});
 if(frame.flashUntil>time)virtualJobs.current.push({at:frame.flashUntil,run:()=>setLevelToast(false)});
};
useEffect(()=>{
 if(seekQuestFocus.current)focusQuestCard(tableTennisId);
},[demoReplay]);
const goScenario=(index:number)=>{
 if(!demoActive){
  liveSnapshot.current=structuredClone(captureSession());suspendRealJobs();
  setDemoPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 }
 setDemoActive(true);
 resetScenario(index);
};const exitDemo=()=>{
 if(!demoActive)return;
 cancelJobs();
 const saved=liveSnapshot.current;
 if(saved){
  setProfile(saved.profile);setReady(saved.ready);setStep(saved.step);setTab(saved.tab);setLocation(saved.location);setThreads(saved.threads);setGame(saved.game);setPrefs(saved.prefs);setSeenAlerts(saved.seenAlerts);setSound(saved.sound);setEditing(saved.editing);setPeer(saved.peer);setChat(saved.chat);setWorldChat(saved.worldChat);setPanel(saved.panel);setClassQuery(saved.classQuery);setForumStore(saved.forumStore);setChatTab(saved.chatTab);
  setForumHidden(saved.forumHidden);setText(saved.text);setTyping(saved.typing);setHelloTarget(saved.helloTarget);setOrb(saved.orb);setLevelToast(saved.levelToast);setQuestToast(saved.questToast);setReset(saved.reset);setLobbyForum(saved.lobbyForum);setMeetPeer(saved.meetPeer);setIdeasMode(saved.ideasMode);
 }
 liveSnapshot.current=null;setDemoActive(false);setDemoScrubbing(false);setForumAutomation(null);
 for(const job of suspendedJobs.current)scheduleReal(job.run,job.remaining);
 suspendedJobs.current=[];
};
useEffect(()=>{if(!demoActive||!demoAdvancing)return;const timer=setInterval(()=>setDemoTime(t=>t+100),100);return()=>clearInterval(timer);},[demoActive,demoAdvancing]);
useEffect(()=>{if(!demoActive||!demoAdvancing)return;if(demoTime>=scenario.duration){resetScenario((scenarioIndex+1)%demoScenarios.length);return;}const due=virtualJobs.current.filter(job=>job.at<=demoTime);virtualJobs.current=virtualJobs.current.filter(job=>job.at>demoTime);due.forEach(job=>job.run());},[demoTime,demoActive,demoAdvancing]);
useEffect(()=>()=>{for(const job of realJobs.current.keys())clearTimeout(job);},[]);


const openPeer=(p:Peer,fromForum=false)=>{setForumPeer(fromForum);setPanel(null);setWorldChat(null);setPeer(p);};
const reachOutToAuthor=(authorId:string)=>{const target=peers.find(p=>p.id===authorId);if(target){setLobbyForum(null);setChatTab('Direct');openPeer(target,true);}};
const nameOf=(p:Peer)=>peerName(p,threads[p.id]);
const openIdeas=(p:Peer,mode:'meet'|'chat'='meet')=>{if(threads[p.id]?.status!=='accepted')return;setIdeasMode(mode);setMeetPeer(p);};
useEffect(()=>{setWorldChat(chat=>chat?.lobby===location?chat:null);},[location]);
useEffect(()=>{if(helloTarget&&threads[helloTarget]?.status==='accepted'){const p=peers.find(p=>p.id===helloTarget)!;setPeer(null);if(p.lobby===location){setTab('Campus');setWorldChat(p);}setHelloTarget(null);}},[threads,helloTarget,location]);
const reward=()=>{setLevelToast(true);ping();later(()=>setLevelToast(false),2800);};
useEffect(()=>{if(demoActive||editing)return;localStorage.setItem(KEY,JSON.stringify({profile,ready,location,threads,game,prefs,seenAlerts,forumStore}));},[profile,ready,location,threads,game,prefs,seenAlerts,forumStore,demoActive,editing]);
useEffect(()=>{const t=setInterval(()=>setThreads(old=>{
 const clock=playback.current;
 return advanceHellos(old,clock.active?clock.time:Date.now(),clock.active&&!clock.playing);
}),200);return()=>clearInterval(t);},[]);
useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[threads,chat,typing]);
useEffect(()=>{if(location!=='Library'&&location!=='Dorm common area'&&!profile.classes.includes(location))setLocation(profile.classes[0]||'Library');},[profile.classes,location]);
const update=(key:keyof Profile,value:Profile[keyof Profile])=>setProfile(p=>({...p,[key]:value}));
const ping=()=>{if(!sound)return;const ctx=new AudioContext();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(620,ctx.currentTime);gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);osc.start();osc.stop(ctx.currentTime+.15);osc.onended=()=>ctx.close();};
const hello=(p:Peer)=>{if(threads[p.id])return;ping();setPeer(null);setWorldChat(null);setHelloTarget(p.id);setOrb(true);later(()=>setOrb(false),1000);setThreads(old=>({...old,[p.id]:{status:'pending',acceptedAt:(demoActive?demoTime:Date.now())+helloDelay,messages:[]}}));};
const sendTo=(target:Peer,value:string,scriptedReply?:string)=>{
 if(threads[target.id]?.status!=='accepted'||!value.trim()||typing)return;
 const id=target.id,v=value.trim();
 setText('');
 setThreads(old=>{
  const thread=old[id];
  return thread?.status==='accepted'?{...old,[id]:{...thread,messages:[...thread.messages,{text:v,own:true}]}}:old;
 });
 setTyping(id);
 later(()=>finishChatReply(id,scriptedReply??reply(v,profile,target)),scriptedReply?demoReplyDelay:1100);
};
const send=(value:string)=>{if(chat)sendTo(chat,value);};
const current=eligible(location),recs=recommended(profile,location);
const acceptQuest=(quest:Quest)=>{if(joinQuest(game,quest.id)===game)return;setGame(g=>joinQuest(g,quest.id));reward();};
useEffect(()=>{
 if(!demoActive||!demoAdvancing||demoTime>=scenario.duration)return;
 scenario.events.forEach((cue,index)=>{
  if(cue.at>demoTime||firedCues.current.has(index))return;
  firedCues.current.add(index);
  const target=eligible(scenario.location)[0];
  const community=`class:${scenario.location}`;
  const quest=game.quests.find(quest=>quest.id===tableTennisId);
  switch(cue.action){
   case 'introduction':setLobbyForum(null);openPeer(target);break;
   case 'hello':hello(target);break;
   case 'chats':setWorldChat(null);setTab('Chats');setChatTab('Direct');break;
   case 'open-chat':if(threads[target.id]?.status==='accepted')setChat(target);break;
   case 'chat-draft':if(chat?.id===target.id)setText(cue.text);break;
   case 'chat-send':if(chat?.id===target.id)sendTo(target,text,cue.reply);break;
   case 'meet':if(chat?.id===target.id)openIdeas(target);break;
   case 'classroom':setMeetPeer(null);setChat(null);setTab('Campus');setWorldChat(target);break;
   case 'quest-notification':{
    const activity=initialGame.quests.find(quest=>quest.id===tableTennisId);
    if(activity&&!quest)setGame(game=>({...game,quests:[activity,...game.quests]}));
    break;
   }
   case 'open-alert':if(quest)selectAlert(quest);break;
   case 'focus-quest':focusQuestCard(tableTennisId);break;
   case 'accept-quest':if(quest)acceptQuest(quest);break;
   case 'forum-compose':openLobbyForum(community,undefined,true);break;
   case 'forum-title':setForumAutomation({action:'title',text:cue.text});break;
   case 'forum-body':setForumAutomation({action:'body',text:cue.text});break;
   case 'forum-publish':setForumAutomation({action:'publish',postId:alexThread});break;
   case 'forum-open':
    setForumAutomation(null);
    openLobbyForum(community,alexThread);
    break;
   case 'forum-draft':setForumAutomation({action:'draft',postId:alexThread,text:cue.text});break;
   case 'forum-reply':setForumAutomation({action:'reply',postId:alexThread});break;
   case 'classmate-reply':
    setForumStore(store=>addForumReply(store,{...profile,name:target.name},community,alexThread,cue.text));
    break;
  }
 });
},[demoTime,demoActive,demoAdvancing,scenarioIndex]);
const editor=(n:number)=><>{n===0&&<><div className="form-hero"><h1>{editing?'Edit profile':'Create your profile'}</h1></div><label>What should we call you?<input maxLength={24} placeholder="Your display name" value={profile.name} onChange={e=>update('name',e.target.value)}/></label><label>Introduction<textarea maxLength={150} placeholder="Tell classmates about yourself" value={profile.intro} onChange={e=>update('intro',e.target.value)}/></label></>}{n===1&&<><h1>Your avatar</h1><p>Choose your character.</p><div className="avatar-preview"><Avatar data={profile.avatar} size={122}/><span>{profile.name||'Your avatar'}</span></div><div className="type-options">{['Human','Dog','Cat','Firebird'].map(type=><button key={type} className={profile.avatar.type===type?'selected':''} onClick={()=>update('avatar',{...profile.avatar,type,color:type==='Firebird'&&profile.avatar.type!=='Firebird'?'#c9473d':profile.avatar.color})}><Avatar data={{...profile.avatar,type}} size={43}/>{type}</button>)}</div><div className="custom-grid">{[[profile.avatar.type==='Human'?'Hair color':profile.avatar.type==='Firebird'?'Flame color':'Fur color','color',profile.avatar.type==='Firebird'?['#c9473d','#a83d4a','#e87e42','#d7a84c','#9e699d']:['#715e4d','#d79a62','#ed895d','#c4ab86','#a298b8']],...(profile.avatar.type==='Human'?[['Skin tone','skin',['#f6d5b5','#e7b58c','#b87952','#775340']],['Hairstyle','hair',['Short','Long','Curly']]]:[]),...(profile.avatar.type!=='Firebird'?[['Clothes','clothes',['#709988','#849bba','#bb8da4','#cf966d']]]:[]),['Accessory','accessory',['None','Glasses','Scarf','Flower']],['Held item','item',['None','Coffee','Book','Camera']]].map(([label,key,options])=><label key={key as string}>{label as string}<div className="choices">{(options as string[]).map(v=><button key={v} aria-label={`${label}: ${v}`} className={(profile.avatar as any)[key as string]===v?'chosen':''} onClick={()=>update('avatar',{...profile.avatar,[key as string]:v})} style={v.startsWith('#')?{background:v}:undefined}>{v.startsWith('#')?((profile.avatar as any)[key as string]===v?<Check size={16}/>:null):v}</button>)}</div></label>)}</div></>}{n===2&&<><h1>Your interests</h1><p>Optional. Choose the interests you want to share.</p><div className="interest-grid">{interests.map((v,i)=><button key={v} className={profile.interests.includes(v)?'selected':''} onClick={()=>update('interests',profile.interests.includes(v)?profile.interests.filter(t=>t!==v):[...profile.interests,v])}><span>{['↟','▣','✧','♧','♨','☆','✿','⚑'][i%8]}</span>{v}{profile.interests.includes(v)&&<Check size={14}/>}</button>)}</div><div className="soft-note">{profile.interests.length} selected</div></>}{n===3&&<><h1>Your classes</h1><p>Select the exact sections where you’d like to meet classmates. You can change these anytime.</p><ClassPicker selected={profile.classes} onChange={values=>update('classes',values)} query={classQuery} onQueryChange={setClassQuery}/></>}</>;
return <div className={demoActive?'desktop-stage demo-stage':'desktop-stage'}>{demoActive&&<DemoScenarioPanel scenario={scenario}/>}<div className="phone" data-session={demoActive?'demo':'live'} data-demo-playing={demoPlaying} onPointerDownCapture={e=>{if(demoActive&&!(e.target as HTMLElement).closest('.demo-strip'))setDemoPlaying(false);}} onKeyDownCapture={e=>{if(demoActive&&e.key!=='Tab'&&!(e.target as HTMLElement).closest('.demo-strip'))setDemoPlaying(false);}}><header><button className="brand" onClick={()=>{exitDemo();setTab('Campus');setChat(null);}} aria-label="USTogether home"><span className="brand-mark"><Users size={18}/></span>UST<span>ogether</span><i>✦</i></button><div className="header-actions">{ready&&!editing&&<div className="header-tools" role="group" aria-label="Campus shortcuts"><button aria-label="Open lobby quests" title="Quests" onClick={()=>setPanel('quests')}><Trophy size={18}/></button><button aria-label="Open students nearby" title="Students" onClick={()=>setPanel('students')}><UsersRound size={18}/></button><button aria-label={`Open quest notifications, ${unread.length} unread`} title="Alerts" onClick={()=>{setQuestToast(null);setPanel('alerts');}}><Bell size={18}/>{unread.length>0&&<b>{unread.length}</b>}</button></div>}<button className="header-profile" aria-label={`Open profile, level ${level}`} onClick={()=>{exitDemo();setTab('Profile');setChat(null);}}><span className="header-avatar"><Avatar data={profile.avatar} size={36}/></span><span className="header-profile-info"><b>{profile.name||'Profile'}</b><small>{`LV ${level}`}</small></span></button></div></header>
{demoActive&&<DemoWalkthrough index={scenarioIndex} time={demoTime} playing={demoPlaying} scrubbing={demoScrubbing} onScrub={setDemoScrubbing} onSeek={time=>resetScenario(scenarioIndex,time)} onSelect={goScenario} onPlay={setDemoPlaying} onReplay={()=>resetScenario(scenarioIndex)} onExit={exitDemo}/>}
{(!ready||editing)?<main className="onboarding"><div className="onboarding-top"><button className="icon-button" aria-label={editing?'Close editor':'Previous step'} onClick={()=>editing?cancelEdit():setStep(Math.max(0,step-1))}>{editing?<X size={20}/>:<ArrowLeft size={20}/>}</button><span>{editing?['Edit profile','Edit avatar','Edit interests','Edit classes'][step]:`STEP ${step+1} OF 4`}</span></div>{!editing&&<div className="step-lines">{[0,1,2,3].map(i=><button key={i} aria-label={`Go to ${['profile','avatar','interests','classes'][i]} step`} disabled={i>step} className={i<=step?'active':''} onClick={()=>setStep(i)}/>)}</div>}<div className="onboarding-content">{editor(step)}</div><div className="onboarding-footer"><button className="primary" disabled={step===0&&(!profile.name.trim()||!profile.intro.trim())} onClick={finishProfile}>{editing?'Save changes':step===3?'Enter campus':'Continue'}<ArrowRight size={17}/></button>{!editing&&step>=2&&<button className="text-button" onClick={()=>{update(step===2?'interests':'classes',[]);if(step===3){setReady(true);setTab('Campus');setLocation('Library');}else finishProfile();}}>Skip for now</button>}{!editing&&step===0&&<button className="text-button" onClick={()=>{setProfile({...demo,avatar:{...demo.avatar}});setStep(1);}}>Use demo profile <Sparkles size={14}/></button>}</div></main>:chat?<main className="chat-screen"><div className="chat-heading"><button className="icon-button" aria-label="Back to conversations" onClick={()=>{setChat(null);setTab('Chats');}}><ArrowLeft size={20}/></button><Avatar data={chat.avatar} size={45}/><div><h2>{chat.name}</h2><small><span className="live-dot"/> Connected</small></div><button className="meet-button" aria-label="Meet face to face" onClick={()=>openIdeas(chat)}><Handshake size={17}/><span>Meet f2f</span></button></div><div className="message-scroll"><div className="chat-begin"><p>{chat.lobby}</p></div>{threads[chat.id]?.messages.map((m,i)=><div className={`message ${m.own?'own':''}`} key={i}>{m.text}</div>)}{typing===chat.id&&<div className="message typing" aria-live="polite">{chat.name} is typing<span>•••</span></div>}<div ref={bottom}/></div><div className="chat-compose"><div className="starter-scroll"><button className="starter-more" onClick={()=>openIdeas(chat,'chat')}><Sparkles size={14}/>More ideas</button>{starters(profile,chat).map(s=><button key={s} disabled={!!typing} onClick={()=>send(s)}>{s}</button>)}</div><form onSubmit={e=>{e.preventDefault();send(text);}}><input aria-label="Message" placeholder={`Say something to ${chat.name}…`} value={text} onChange={e=>setText(e.target.value)} maxLength={500}/><button className="send-button" aria-label="Send message" disabled={!text.trim()||!!typing}><Send size={19}/></button></form></div></main>:<><main className="main-scroll">{tab==='Campus'?<><div className="campus-heading"><h1>Campus</h1><span className="location-label">{location.includes(' · ')?'Classroom':location==='Library'?'Library':'Common room'}</span><span className="presence">{current.length+1} here</span></div><div className="lobby-select-wrap"><select aria-label="Choose lobby or lecture" value={location} onChange={e=>{if(e.target.value==='__classes'){startEdit(3);}else{setLocation(e.target.value);setWorldChat(null);}}}><optgroup label="My classrooms">{profile.classes.map(c=><option key={c} value={c}>{c}</option>)}</optgroup><optgroup label="Campus spaces"><option value="Library">Library</option><option value="Dorm common area">Dorm common area</option></optgroup><option value="__classes">Manage classes…</option></select><ChevronDown size={17}/>{questToast&&!panel&&!lobbyForum&&ready&&!editing&&<div className="quest-alert-toast" role="status"><button onClick={()=>selectAlert(questToast)}><Bell size={18}/><span><strong>New quest for your interests</strong>{questToast.title}</span></button><button aria-label="Dismiss quest alert" onClick={()=>{setSeenAlerts(ids=>[...ids,questToast.id]);setQuestToast(null);}}><X size={17}/></button></div>}</div><LobbyForum hidden={forumHidden} onToggle={()=>setForumHidden(value=>!value)} location={location} profile={profile} store={forumStore} onOpen={openLobbyForum} onEdit={startEdit}/><Scene announcement={roomAnnouncement(profile,forumStore,location,current,demoActive?demoEpoch.current+demoTime:Date.now())} onPost={(community,post)=>openLobbyForum(community,post)} location={location} profile={profile} peers={current} onPeer={openPeer} orb={orb} threads={threads} chat={worldChat} onChat={setWorldChat} onCloseChat={()=>setWorldChat(null)} onMeet={()=>worldChat&&openIdeas(worldChat)} onIdeas={()=>worldChat&&openIdeas(worldChat,'chat')} onSend={value=>worldChat&&sendTo(worldChat,value)} typing={typing===worldChat?.id} pendingId={helloTarget} level={level} demoPaused={demoActive&&!demoAdvancing} clock={demoActive?demoEpoch.current+demoTime:undefined}/><div className="world-tip">Tap the floor to walk · Tap a student to meet</div></>:tab==='Chats'?<div className="page-pad"><h1>Chats</h1><div className="chat-tabs" role="tablist" aria-label="Chat type">{['Direct','Forums'].map(t=><button key={t} role="tab" aria-selected={chatTab===t} className={chatTab===t?'selected':''} onClick={()=>setChatTab(t)}>{t}</button>)}</div>{chatTab==='Forums'?<Forums key={demoActive?demoReplay:'live'} profile={profile} store={forumStore} onChange={setForumStore} onEdit={startEdit} onReachOut={reachOutToAuthor} now={demoActive?demoEpoch.current+demoTime:undefined}/>:<>{Object.keys(threads).length?Object.entries(threads).map(([id,t])=>{const p=peers.find(p=>p.id===id)!;return <button className="conversation-row" key={id} onClick={()=>t.status==='accepted'?setChat(p):openPeer(p)}><Avatar data={p.avatar} size={62}/><div><strong>{nameOf(p)}</strong><p>{t.status==='pending'?'Hello is on its way…':t.messages.at(-1)?.text||'Say hello again'}</p></div><span>{t.status==='pending'?'Pending':<ChevronRight size={17}/>}</span></button>;}):<div className="empty-state"><MessageCircle size={40}/><h2>No conversations yet</h2><p>Meet someone on campus and throw a hello. Your conversations will live here.</p><button className="primary" onClick={()=>setTab('Campus')}>Go to campus<ArrowRight size={17}/></button></div>}</>}</div>:<div className="page-pad"><h1>Your profile</h1><div className="profile-card"><Avatar data={profile.avatar} size={112}/><h2>{profile.name}</h2><span className="profile-level">Level {level} · {game.joined.length} quests joined</span><p>{profile.intro}</p><div className="mini-tags">{profile.interests.map(i=><span key={i}>{i}</span>)}</div></div><button className="setting-row" onClick={()=>{startEdit(0);}}><UserRoundPen size={19}/><span>Edit profile</span><ChevronRight size={17}/></button><button className="setting-row" onClick={()=>startEdit(1)}><Sparkles size={19}/><span>Edit avatar</span><ChevronRight size={17}/></button><button className="setting-row" onClick={()=>{startEdit(2);}}><Heart size={19}/><span>Edit interests</span><ChevronRight size={17}/></button><button className="setting-row" onClick={()=>{startEdit(3);}}><BookOpen size={19}/><span>My classes<small>{profile.classes.join(', ')}</small></span><ChevronRight size={17}/></button><button className="setting-row" onClick={()=>setSound(s=>!s)}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}<span>Quiet interaction sounds</span><b>{sound?'On':'Off'}</b></button><button className="setting-row" onClick={()=>setPanel('alert-settings')}><Bell size={19}/><span>Quest alert interests<small>{prefs.enabled?`${prefs.interests.length} interests selected`:'Notifications off'}</small></span><ChevronRight size={17}/></button><button className="setting-row" onClick={()=>goScenario(0)}><Presentation size={19}/><span>{walkthroughTitle}<small>Play, replay, or choose a scenario</small></span><ChevronRight size={17}/></button><div className="about"><h2>About USTogether</h2><p>A university course prototype inspired by HKUST. All students, schedules, presence, invitations, quests, and replies are simulated. Quest invitations to nearby students are automatically accepted. Joining a quest awards one level, once per quest. Quest alerts are shown in-app for selected interests. Forums follow your selected interests and exact lecture sections. Forum membership and messages are simulated locally; this prototype has no server authentication. Everything is saved only in this browser.</p></div><button className="reset-button" onClick={()=>setReset(true)}>Reset demo</button></div>}</main><nav>{[[Compass,'Campus'],[MessageCircle,'Chats'],[CircleUserRound,'Profile']].map(([Icon,label])=>{const I=Icon as typeof House;return <button key={label as string} className={tab===label?'active':''} onClick={()=>{setTab(label as string);setPeer(null);}}><I size={21}/><span>{label as string}</span>{label==='Chats'&&Object.values(threads).some(t=>t.status==='accepted')&&<i/>}</button>;})}</nav></>}
{lobbyForum&&<Popup key={demoActive?`forum-${demoReplay}`:undefined} title={lobbyForum.community?.startsWith("class:")?"Classroom discussions":"Your communities"} onClose={()=>setLobbyForum(null)}><Forums key={`${location}:${lobbyForum.community}:${lobbyForum.post||""}:${!!lobbyForum.compose}`} profile={profile} store={forumStore} onChange={setForumStore} onEdit={page=>{setLobbyForum(null);startEdit(page);}} onReachOut={reachOutToAuthor} initialCommunity={lobbyForum.community} initialPost={lobbyForum.post} automation={forumAutomation} startComposing={lobbyForum.compose} initialDraft={lobbyForum.draft} now={demoActive?demoEpoch.current+demoTime:undefined} postLocation={location} onPublished={()=>setLobbyForum(null)} embedded/></Popup>}
{meetPeer&&<Popup key={demoActive?`meet-${demoReplay}`:undefined} title={ideasMode==='chat'?`Conversation ideas with ${meetPeer.name}`:`Meet ${meetPeer.name} face to face`} onClose={()=>setMeetPeer(null)}><ConversationIdeas key={`${meetPeer.id}:${ideasMode}`} profile={profile} peer={meetPeer} busy={!!typing} onUse={ideasMode==='chat'?question=>{sendTo(meetPeer,question);setMeetPeer(null);}:undefined} onDraft={ideasMode==='chat'?question=>{setText(question);setMeetPeer(null);}:undefined}/><button className="primary conversation-return" onClick={()=>setMeetPeer(null)}>Back to chat<ArrowRight size={17}/></button></Popup>}
{panel&&<Popup key={demoActive?`panel-${demoReplay}`:undefined} title={panel==='quests'?'Lobby quests':panel==='students'?'Students nearby':panel==='alerts'?'Quest alerts':'Quest alert settings'} onClose={()=>setPanel(null)}>{panel==='quests'?<QuestBoard key={`${location}:${demoActive?demoReplay:0}`} game={game} setGame={setGame} lobby={location} name={profile.name} peers={current} onAccept={acceptQuest} schedule={later}/>:panel==='students'?<section className="recommendations"><div className="section-heading"><div><h2>Students nearby</h2></div><span className="count-badge">{current.length}</span></div>{[...recs,...current.filter(p=>!recs.some(r=>r.id===p.id))].map((p,i)=><button className="peer-card" key={p.id} onClick={()=>openPeer(p)}><div className={`portrait portrait-${i}`}><Avatar data={p.avatar} size={60}/></div><div className="peer-details"><div><strong>{nameOf(p)}</strong>{i===0&&<span className="tiny-badge">{threads[p.id]?.status==='accepted'?'Message':'Say hello'}</span>}</div><p>{shared(profile,p).length?`You both like ${shared(profile,p).slice(0,2).join(' and ').toLowerCase()}.`:'A new perspective, in your corner of campus.'}</p><div className="mini-tags">{(shared(profile,p).length?shared(profile,p):[location]).slice(0,2).map(s=><span key={s}>{s}</span>)}</div></div><ChevronRight size={17}/></button>)}</section>:panel==='alerts'?<AlertList quests={alerts} seen={seenAlerts} onSelect={selectAlert} onRead={()=>setSeenAlerts(ids=>[...new Set([...ids,...alerts.map(q=>q.id)])])} onSettings={()=>setPanel('alert-settings')}/>:<AlertSettings prefs={prefs} onChange={setPrefs} profileInterests={profile.interests} onPreview={previewAlert}/>}</Popup>}
{peer&&<div className="overlay" onClick={()=>setPeer(null)}><section ref={introPanel} className="dialogue introduction-dialogue" role="dialog" aria-modal="true" aria-label={`Meet ${nameOf(peer)}`} onClick={e=>e.stopPropagation()}><button ref={introClose} className="close-button" aria-label="Close introduction" onClick={()=>setPeer(null)}><X size={19}/></button><div className="introduction-content"><div className="dialogue-portrait"><Avatar data={peer.avatar} size={106}/><div><h1>{nameOf(peer)}<span>✧</span></h1><small>{peer.lobby}</small></div></div><p className="intro-quote">“{peer.intro}”</p><div className="mini-tags">{peer.interests.map(i=><span className={profile.interests.includes(i)?'shared':''} key={i}>{i}{profile.interests.includes(i)&&' · shared'}</span>)}</div><div className="opener"><Sparkles size={17}/><div><strong>Conversation starter</strong><p>{starters(profile,peer)[0]}</p></div></div></div><div className="introduction-actions">{!threads[peer.id]?<><button className="primary" onClick={()=>hello(peer)}><Send size={17}/>Throw a hello<span>✦</span></button></>:threads[peer.id].status==='pending'?<div className="pending" role="status"><span className="orb-small">✦</span><strong>Hello is on its way…</strong><p>Giving them a moment to wave back.</p></div>:<><div className="accepted" role="status"><Check size={18}/>{nameOf(peer)} caught your hello!</div><button className="primary" onClick={()=>{if(forumPeer){setChat(peer);setWorldChat(null);setChatTab('Direct');setTab('Chats');}else{setWorldChat(peer);setTab('Campus');}setPeer(null);}}><MessageCircle size={18}/>{threads[peer.id].messages.length>1?'Message':'Open chat'}<ArrowRight size={17}/></button></>}</div></section>{orb&&<div className="overlay-orb">✦</div>}</div>}
{levelToast&&<div className="level-toast" role="status"><Sparkles size={21}/><div><strong>Level up!</strong><span>You reached Level {level}</span></div><b>+1</b></div>}
{reset&&<div className="overlay"><section className="dialogue" role="alertdialog" aria-modal="true" aria-label="Reset demo"><h1>Reset demo?</h1><p>This clears your profile, classes, chats, quests, levels, and alert settings on this browser.</p><button className="primary" onClick={()=>{if(demoActive){resetScenario(scenarioIndex);setReset(false);}else{localStorage.removeItem(KEY);window.location.reload();}}}>Reset & start again</button><button className="text-button" onClick={()=>setReset(false)}>Cancel</button></section></div>}
</div></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
