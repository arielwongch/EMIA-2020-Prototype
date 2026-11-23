import {test,expect,type Page} from '@playwright/test';

const section='COMP 1021 \u00b7 L1';
async function openConversation(page:Page,id='p6-0'){
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 await page.addInitScript(({id,section})=>localStorage.setItem('ustogether-v1',JSON.stringify({ready:true,location:'Library',prefs:{enabled:false,interests:[]},profile:{name:'Real Student',intro:'Coffee and photos after class.',interests:['Hiking','Photography','Coffee'],classes:[section],avatar:{type:'Firebird',color:'#c9473d',clothes:'#709988',accessory:'Scarf',item:'Coffee',hair:'Short',skin:'#e7b58c'}},threads:{[id]:{status:'accepted',acceptedAt:0,messages:[{own:false,text:'Hello!'}]}}})),{id,section});
 await page.goto('./');await page.locator('.scene-shell').waitFor();
 await page.locator('nav').getByRole('button',{name:'Chats',exact:true}).click();await page.locator('.conversation-row').click();
 await page.getByRole('button',{name:'More ideas',exact:true}).click();
 return page.getByRole('dialog');
}

test('personal chat browses, rotates and sends preset interest conversations with matching replies',async({page})=>{
 const dialog=await openConversation(page);
 await expect(dialog).toHaveAccessibleName('Conversation ideas with Noah');await expect(dialog.locator('.topic-card')).toHaveCount(4);
 const first=await dialog.locator('.topic-card p').allTextContents();await dialog.getByRole('button',{name:'More ideas',exact:true}).click();expect(await dialog.locator('.topic-card p').allTextContents()).not.toEqual(first);
 await dialog.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption('interest:Swimming');await expect(dialog).toContainText('Something new you could explore together.');await expect(dialog.locator('.topic-card')).toHaveCount(4);
 await dialog.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption('interest:Table tennis');const question=await dialog.locator('.topic-card p').first().innerText();await dialog.getByRole('button',{name:'Send this starter',exact:true}).first().click();await expect(dialog).toHaveCount(0);await expect(page.locator('.message.own')).toHaveText(question);
 await page.clock.runFor(1300);await expect(page.locator('.message').last()).toContainText('Doubles sounds fun');
 await page.getByRole('button',{name:'Back to conversations',exact:true}).click();await page.locator('nav').getByRole('button',{name:'Campus',exact:true}).click();await page.getByRole('button',{name:'Chat with Noah',exact:true}).click();await page.getByRole('button',{name:'More conversation ideas',exact:true}).click();
 await page.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption('general:Study habits');await expect(page.locator('.topic-card')).toHaveCount(4);
});

test('personal chat can place an idea in the draft for editing before it is sent',async({page})=>{
 const dialog=await openConversation(page);
 await dialog.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption('interest:Photography');
 const question=await dialog.locator('.topic-card p').first().innerText();
 await dialog.getByRole('button',{name:'Edit and send',exact:true}).first().click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 const message=page.getByRole('textbox',{name:'Message'});
 await expect(message).toHaveValue(question);
 await expect(page.locator('.message.own')).toHaveCount(0);
 const edited=question.replace(/\bgot you into photography\b/i,'made you love photos');
 await message.fill(edited);
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 await expect(page.locator('.message.own')).toHaveText(edited);
});

test('class starters use the exact shared section and face-to-face topics remain read-only',async({page})=>{
 const dialog=await openConversation(page,'p0-0');
 await dialog.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption(`class:${section}`);await expect(dialog).toContainText('You are both in this exact lecture section.');
 const questions=await dialog.locator('.topic-card p').allTextContents();expect(questions).toHaveLength(4);expect(questions.every(question=>question.includes(section))).toBe(true);
 await dialog.getByRole('button',{name:'Send this starter',exact:true}).first().click();await page.clock.runFor(1300);await expect(page.locator('.message').last()).toContainText('Breaking a problem into small steps');
 await page.getByRole('button',{name:'Meet face to face',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Meet Sophie face to face');await expect(page.locator('.topic-card')).toHaveCount(4);
 await page.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption(`class:${section}`);await expect(page.getByRole('button',{name:'Send this starter',exact:true})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Conversation topic',exact:true}).selectOption('general:Meetup ideas');await expect(page.locator('.topic-card')).toHaveCount(4);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
