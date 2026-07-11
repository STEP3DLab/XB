const INVITES={
  'evgeniy-larisa':{salutation:'Дорогие',name:'Евгений и Лариса',named:true},
  'aleksey-natalya':{salutation:'Дорогие',name:'Алексей и Наталья',named:true},
  'family':{salutation:'Дорогая',name:'семья',named:true},
  'guests-1':{salutation:'Дорогие',name:'гости',named:false,stay:false},
  'guests-2':{salutation:'Дорогие',name:'гости',named:false,stay:true}
};
const params=new URLSearchParams(location.search);
const guestId=(params.get('guest')||params.get('id')||'').trim();
const invite=INVITES[guestId]||{salutation:'Дорогие',name:'гости',named:false,stay:false};
const showStay=invite.stay===true||params.get('stay')==='lukino';

document.querySelector('[data-salutation]').textContent=invite.salutation;
document.querySelector('[data-guest-name]').textContent=invite.name;
document.title='ХВ • '+(invite.name==='гости'?'свадьба в деревне':invite.name);

const staySection=document.querySelector('.stay-section');
const stayMenu=document.querySelector('[data-stay-menu]');
if(showStay){staySection.hidden=false;stayMenu.hidden=false}

const nameField=document.getElementById('nameField');
const guestInput=document.getElementById('guestInput');
const rsvpTitle=document.querySelector('[data-rsvp-title]');
if(invite.named){
  nameField.hidden=true;
  guestInput.value=invite.name;
  rsvpTitle.textContent=invite.name+', ждём ваш ответ';
}

const weddingDate=new Date('2026-07-25T15:00:00+03:00');
function tick(){
  const diff=Math.max(0,weddingDate-new Date());
  const d=Math.floor(diff/864e5),h=Math.floor(diff/36e5)%24,m=Math.floor(diff/6e4)%60,s=Math.floor(diff/1e3)%60;
  document.querySelector('[data-days]').textContent=d;
  document.querySelector('[data-hours]').textContent=String(h).padStart(2,'0');
  document.querySelector('[data-minutes]').textContent=String(m).padStart(2,'0');
  document.querySelector('[data-seconds]').textContent=String(s).padStart(2,'0');
}
tick();setInterval(tick,1000);

const menuButton=document.querySelector('.burger'),menu=document.querySelector('.menu');
menuButton.onclick=()=>{
  const open=document.body.classList.toggle('open-menu');
  menu.classList.toggle('on',open);
};
document.querySelectorAll('.menu a').forEach(a=>a.onclick=()=>{
  document.body.classList.remove('open-menu');
  menu.classList.remove('on');
});
document.querySelectorAll('.faq-q').forEach(button=>button.onclick=()=>button.closest('.faq-item').classList.toggle('open'));

const rsvpForm=document.getElementById('rsvpForm');
const churchCheck=document.getElementById('churchCheck');
const formStatus=document.getElementById('formStatus');
rsvpForm.addEventListener('submit',event=>{
  event.preventDefault();
  const guestName=invite.named?invite.name:guestInput.value.trim();
  if(!guestName){
    formStatus.textContent='Пожалуйста, напишите фамилию и имя.';
    guestInput.focus();
    return;
  }
  const church=churchCheck.checked?'да':'нет';
  const accommodation=showStay?' Для нас предусмотрена ночёвка в Лукино.':'';
  const message=`Владимир, подтверждаем участие в деревенской свадьбе 25 июля. Гости: ${guestName}. На венчании 24 июля: ${church}.${accommodation}`;
  formStatus.textContent='Открываем сообщение для отправки…';
  window.open('https://wa.me/79969662393?text='+encodeURIComponent(message),'_blank','noopener');
});
