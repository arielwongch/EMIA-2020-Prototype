import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Popup from './Popup';
import {Plus,BookOpen,CircleDot,Heart,Network,MessageCircle,Send,X} from 'lucide-react';
import Avatar from './Avatar';
import {availableForums,communityName,forumFeed,addForumPost,addForumReply,toggleForumLike,type ForumStore} from './forums';
import type {Profile} from './model';
import type {ForumDraft} from './demoPlayback';
export type ForumAutomation =
 | {action:'title';text:string}|{action:'body';text:string}
 | {action:'publish';postId:string}|{action:'reply';postId:string}
 | {action:'draft';postId:string;text:string};
export default function Forums({profile,store,onChange,onEdit,onReachOut,automation,initialCommunity=null,initialPost=null,startComposing=false,initialDraft,embedded=false,postLocation,onPublished,now}:{profile:Profile;store:ForumStore;onChange:(store:ForumStore)=>void;onEdit:(step:number)=>void;onReachOut?:(authorId:string)=>void;automation?:ForumAutomation|null;initialCommunity?:string|null;initialPost?:string|null;startComposing?:boolean;initialDraft?:ForumDraft;embedded?:boolean;postLocation?:string;onPublished?:()=>void;now?:number}){
 const [activePost,setActivePost]=useState<string|null>(initialPost);
 const [selected,setSelected]=useState<string|null>(initialCommunity),[composing,setComposing]=useState(startComposing),[destination,setDestination]=useState(''),[title,setTitle]=useState(initialDraft?.title??''),[body,setBody]=useState(initialDraft?.body??''),[expanded,setExpanded]=useState<string[]>(initialPost?[initialPost]:[]),[drafts,setDrafts]=useState<Record<string,string>>(initialDraft&&initialPost?{[initialPost]:initialDraft.reply}:{});
 const targetPost=useRef<HTMLElement|null>(null);
 useEffect(()=>{targetPost.current?.scrollIntoView({block:'start'});},[]);
 const trigger=useRef<HTMLButtonElement>(null),first=useRef<HTMLElement|null>(null);
 const forums=availableForums(profile),filter=forums.find(f=>f.id===selected),forum=forums.find(f=>f.id===(filter?.id||destination))||forums[0],feed=forumFeed(profile,store,filter?.id||null).filter(entry=>!activePost||entry.post.id===activePost),posts=feed.map(entry=>entry.post);
 const publish=(id:string=crypto.randomUUID())=>{if(!forum||!title.trim()||!body.trim())return;onChange(addForumPost(store,profile,forum,{id,title:title.trim(),text:body.trim(),author:profile.name,authorId:'you',room:forum.kind==='class'?forum.name:postLocation,createdAt:now??Date.now(),likedBy:[],replies:[]}));setTitle('');setBody('');setComposing(false);setActivePost(null);onPublished?.();};
 const comment=(id:string,community=feed.find(e=>e.post.id===id)?.forum.id)=>{if(!community||!drafts[id]?.trim())return;onChange(addForumReply(store,profile,community,id,drafts[id]));setDrafts(d=>({...d,[id]:''}));};
 useEffect(()=>{
  if(!automation)return;
  switch(automation.action){
   case 'title':setTitle(automation.text);break;
   case 'body':setBody(automation.text);break;
   case 'publish':publish(automation.postId);break;
   case 'draft':
    if(activePost===automation.postId)setDrafts(previous=>({...previous,[automation.postId]:automation.text}));
    break;
   case 'reply':
    if(activePost===automation.postId)comment(automation.postId);
    break;
  }
 },[automation]);
 const demoReplyAction=automation&&(automation.action==='draft'||automation.action==='reply')&&activePost===automation.postId?automation.action:undefined;
 useEffect(()=>{
  if(demoReplyAction)first.current?.querySelector('.social-comment-compose')?.scrollIntoView({block:'nearest'});
 },[demoReplyAction]);
 useEffect(()=>{
  if(automation?.action!=='draft'||activePost!==automation.postId||drafts[automation.postId]!==automation.text)return;
  const field=first.current?.querySelector('textarea[aria-label="Write a comment"]');
  if(field instanceof HTMLTextAreaElement)field.scrollTop=field.scrollHeight;
 },[automation,drafts,activePost]);
 const composerForm=forum?(<form className="social-composer" onSubmit={e=>{e.preventDefault();publish();}}><div className="social-identity"><Avatar data={profile.avatar} size={38}/><strong>{profile.name}</strong><span>New post</span></div><label className="community-destination">Post to<select aria-label="Post community" value={forum.id} onChange={e=>setDestination(e.target.value)} disabled={!!filter}>{forums.map(f=><option key={f.id} value={f.id}>{communityName(f)}</option>)}</select></label><label className="social-field-label" htmlFor="forum-post-title">Title</label><input autoFocus={embedded&&!initialDraft} id="forum-post-title" aria-label="Post title" placeholder="Give your topic a title" maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/><label className="social-field-label" htmlFor="forum-post-body">Description</label><textarea id="forum-post-body" aria-label="Post description" placeholder={`What’s happening in ${forum.name}?`} maxLength={1500} value={body} onChange={e=>setBody(e.target.value)}/><div className="social-compose-footer"><small>{body.length}/1500</small><button className="social-publish" disabled={!title.trim()||!body.trim()}>Post<Send size={15}/></button></div></form>):null;
 if(composing&&embedded)return <section className="forum-inline-composer"><button className="text-button" onClick={()=>setComposing(false)}>&larr; Back to discussions</button>{composerForm}</section>;
 if(!forums.length)return <div className="forum-empty"><Network size={32}/><h2>Find your communities</h2><p>Choose an interest to join a Circle, or a lecture section to join its Classroom.</p><button className="primary" onClick={()=>onEdit(2)}>Choose interests<Heart size={16}/></button><button className="text-button" onClick={()=>onEdit(3)}>Choose classes</button></div>;
 return <section className="forum-detail">{activePost&&<button className="text-button" onClick={()=>{setActivePost(null);setExpanded([]);}}>&larr; All discussions</button>}<div className="community-heading"><div><h2>{filter?communityName(filter):'Your communities'}</h2><small>{filter?(filter.kind==='class'?'Your lecture section only':'Shared interest members'):'Circles & Classrooms'}</small></div><span className="community-symbol">{filter?.kind==='class'?<BookOpen size={21}/>:<Network size={21}/>}</span></div><label className="community-filter">Browse<select aria-label="Filter forum community" value={filter?.id||''} onChange={e=>{setSelected(e.target.value||null);setActivePost(null);setExpanded([]);}}><option value="">All my communities</option><optgroup label="Interest Circles">{forums.filter(f=>f.kind==='interest').map(f=><option key={f.id} value={f.id}>{communityName(f)}</option>)}</optgroup><optgroup label="Classrooms">{forums.filter(f=>f.kind==='class').map(f=><option key={f.id} value={f.id}>{communityName(f)}</option>)}</optgroup></select></label>

 <button ref={trigger} className="community-create-post" onClick={()=>setComposing(true)}><Plus size={18}/>Create post</button>
 {composing&&trigger.current?.closest('.phone')&&createPortal(<Popup title="Create post" onClose={()=>setComposing(false)}>{composerForm}</Popup>,trigger.current.closest('.phone')!)}

 <div className="community-feed-heading"><strong>{filter?'Community posts':'Your feed'}</strong><small>Newest first</small></div><div className="social-feed">{feed.map(({post:p,forum:community},index)=>{const liked=(p.likedBy||[]).includes('you'),open=expanded.includes(p.id);return <article className="social-post" key={p.id} ref={el=>{if(index===0)first.current=el;if(p.id===initialPost)targetPost.current=el;}}><div className="social-identity">{(p.authorId==='you'||(!p.authorId&&p.author===profile.name))?<Avatar data={profile.avatar} size={38}/>:onReachOut&&p.authorId&&p.authorId!=='you'?<button className="forum-author-avatar" aria-label={`View ${p.author}'s profile`} onClick={()=>onReachOut(p.authorId!)}><span className="social-initial">{p.author.slice(0,1)}</span></button>:<span className="social-initial">{p.author.slice(0,1)}</span>}<div><strong>{onReachOut&&p.authorId&&p.authorId!=='you'?<button className="forum-author-name" aria-label={`View ${p.author}'s profile`} onClick={()=>onReachOut(p.authorId!)}>{p.author}</button>:p.author}</strong><small>{p.createdAt?new Date(p.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Group member'}</small></div><button className={`community-badge ${community.kind}`} onClick={()=>{setSelected(community.id);setActivePost(null);setExpanded([]);}} aria-label={`View ${communityName(community)}`}>{community.kind==='class'?<BookOpen size={12}/>:<CircleDot size={12}/>}<span>{communityName(community)}</span></button></div>{p.title&&<h3>{p.title}</h3>}<p className="social-post-text">{p.text}</p><div className="social-actions"><button aria-label={liked?'Unlike post':'Like post'} aria-pressed={liked} className={liked?'is-liked':''} onClick={()=>onChange(toggleForumLike(store,profile,community.id,p.id))}><Heart size={17} fill={liked?'currentColor':'none'}/><span>{liked?'Liked':'Like'}</span><b>{p.likedBy?.length||0}</b></button><button aria-expanded={open} aria-label="Show comments" onClick={()=>setExpanded(ids=>open?ids.filter(id=>id!==p.id):[...ids,p.id])}><MessageCircle size={17}/><span>Comment</span><b>{p.replies.length}</b></button></div>{open&&<section className="social-comments" aria-label="Post comments"><div className="social-comments-heading"><strong>Comments</strong><button aria-label="Close comments" onClick={()=>setExpanded(ids=>ids.filter(id=>id!==p.id))}><X size={16}/></button></div>{!p.replies.length&&<p className="social-no-comments">Be the first to comment.</p>}{p.replies.map((r,i)=><div className="social-comment" key={i}><span className="social-initial">{r.author.slice(0,1)}</span><div><strong>{r.author}</strong><p>{r.text}</p></div></div>)}<form className="social-comment-compose" onSubmit={e=>{e.preventDefault();comment(p.id,community.id);}}><textarea aria-label="Write a comment" placeholder="Write a comment…" value={drafts[p.id]||''} maxLength={1000} onChange={e=>setDrafts(d=>({...d,[p.id]:e.target.value}))}/><button aria-label="Post comment" disabled={!drafts[p.id]?.trim()}><Send size={17}/></button></form></section>}</article>;})}{!posts.length&&<div className="forum-empty"><MessageCircle size={27}/><h2>No posts yet</h2><p>Create a post to start the conversation.</p></div>}</div></section>;
}
