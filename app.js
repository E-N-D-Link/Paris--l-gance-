/* Paris Élégance — public client only; authorization is enforced by Supabase RLS. */
'use strict';
const PROJECT_URL='https://ytdzcxlbtqhpopnyyjys.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_tLYB2xEX_-iaWl3qnm0axg_bau0-f0u';
const CATS={palace:'Palace',restaurant:'Restaurant historique',cafe:'Café & salon de thé',walk:'Promenade',other:'Autre'};
const COLORS={palace:'#9b7844',restaurant:'#a85b51',cafe:'#496a8b',walk:'#488066',other:'#78727a'};
const seed=[
['crillon','Hôtel de Crillon','10 place de la Concorde, 75008 Paris', 'palace',8,48.8671,2.3213,4],
['ritz','Ritz Paris','15 place Vendôme, 75001 Paris','palace',1,48.8681,2.3289,4],
['paix','Café de la Paix','5 place de l’Opéra, 75009 Paris','cafe',9,48.8707,2.3318,3],
['vefour','Le Grand Véfour','17 rue de Beaujolais, 75001 Paris','restaurant',1,48.8665,2.3377,4],
['maxims','Maxim’s','3 rue Royale, 75008 Paris','restaurant',8,48.8689,2.3226,4],
['laperouse','Lapérouse','51 quai des Grands-Augustins, 75006 Paris','restaurant',6,48.8544,2.3415,4],
['nelie','Le Nélie — Jacquemart-André','158 boulevard Haussmann, 75008 Paris','cafe',8,48.8753,2.3102,2],
['angelina','Angelina Rivoli','226 rue de Rivoli, 75001 Paris','cafe',1,48.8651,2.3285,2],
['procope','Le Procope','13 rue de l’Ancienne Comédie, 75006 Paris','restaurant',6,48.8532,2.3395,3],
['colbert','Le Grand Colbert','2 rue Vivienne, 75002 Paris','restaurant',2,48.8665,2.3393,3],
['magots','Les Deux Magots','6 place Saint-Germain-des-Prés, 75006 Paris','cafe',6,48.8541,2.3330,2],
['vendome','Place Vendôme','Place Vendôme, 75001 Paris','walk',1,48.8678,2.3296,0],
['vivienne','Galerie Vivienne','4 rue des Petits-Champs, 75002 Paris','walk',2,48.8666,2.3399,0],
['vosges','Place des Vosges','Place des Vosges, 75004 Paris','walk',4,48.8556,2.3655,0],
['montaigne','Avenue Montaigne','Avenue Montaigne, 75008 Paris','walk',8,48.8662,2.3057,0]
].map(([id,name,address,category,arrondissement,lat,lng,budget])=>({id,name,address,category,arrondissement,lat,lng,budget,description:'',source:'seed'}));
const $=id=>document.getElementById(id);
let db=null, user=null, roomId=null, roomOwner=false, roomMembers=[],custom=[],visits=[],markers=null,map=null,choosing=false,pendingInvite=null,busy=false;
const localKey='paris-elegance-visits-v1';
const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const alertUI=(message,error=false)=>{let el=$('notice');el.textContent=message;el.className=error?'error':'';el.style.display='block';};
const clearNotice=()=>{$('notice').style.display='none'};
const labelBudget=n=>n===0?'Gratuit':'€'.repeat(Math.max(1,Math.min(4,Number(n)||1)));
const allPlaces=()=>[...seed,...custom.map(p=>({...p,source:'custom'}))];
function isVisited(place){if(user&&roomId)return visits.some(v=>v.place_id===String(place.id)&&v.user_id===user.id&&v.visited);return readLocal().includes(String(place.id))}
function readLocal(){try{return JSON.parse(localStorage.getItem(localKey)||'[]')}catch{return []}}
const saveLocal=items=>localStorage.setItem(localKey,JSON.stringify(items));
const active=()=>Boolean(user&&roomId);
function popup(p){return '<div style="min-width:180px"><b>'+escaped(p.name)+'</b><p>'+escaped(p.address)+'</p><small>'+escaped(CATS[p.category]||'Autre')+' · '+labelBudget(p.budget)+'</small></div>'}
function filters(){return {text:$('search').value.toLocaleLowerCase('fr').trim(),cat:$('category').value,status:$('status').value,district:$('district').value,budget:$('budget').value}}
function filtered(){const f=filters();return allPlaces().filter(p=>(!f.text||[p.name,p.address,p.description].join(' ').toLocaleLowerCase('fr').includes(f.text))&&(f.cat==='all'||p.category===f.cat)&&(f.status==='all'||(f.status==='visited')===isVisited(p))&&(f.district==='all'||String(p.arrondissement)===f.district)&&(f.budget==='all'||Number(p.budget)===Number(f.budget)))}
function setOptions(){const select=$('district'),v=select.value,arr=[...new Set(allPlaces().map(p=>p.arrondissement))].sort((a,b)=>a-b);select.innerHTML='<option value="all">Tous</option>'+arr.map(n=>'<option value="'+n+'">'+n+'e</option>').join('');select.value=arr.map(String).includes(v)?v:'all'}
function render(){setOptions();const f=filtered(),total=allPlaces().length,completed=allPlaces().filter(isVisited).length;
$('count').textContent=completed+' / '+total;$('bar').style.width=(total?100*completed/total:0)+'%';
$('places').innerHTML=f.length?f.map(p=>'<article class="place"><div class="place-top"><div><span class="chip" style="background:'+COLORS[p.category]+'18;color:'+COLORS[p.category]+'">'+escaped(CATS[p.category]||'Autre')+'</span><h3>'+escaped(p.name)+'</h3></div><span class="muted" style="font-size:11px">'+labelBudget(p.budget)+'</span></div><p>'+escaped(p.address)+'</p>'+ (p.description?'<p>'+escaped(p.description)+'</p>':'')+'<div class="actions"><label class="visit"><input type="checkbox" data-visit="'+escaped(p.id)+'" '+(isVisited(p)?'checked':'')+'> Visité</label><button type="button" data-focus="'+escaped(p.id)+'">Voir sur la carte</button></div></article>').join(''):'<p class="help">Aucun lieu pour ces filtres.</p>';
markers.clearLayers();for(const p of f){if(!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))continue;const icon=L.divIcon({html:'<div style="width:16px;height:16px;background:'+COLORS[p.category]+';border:3px solid #fff;border-radius:50%;box-shadow:0 1px 8px #0006;'+(isVisited(p)?'outline:3px solid #c7a469;':'')+'"></div>',className:'',iconSize:[16,16],iconAnchor:[8,8]});const marker=L.marker([p.lat,p.lng],{icon}).bindPopup(popup(p));marker.placeId=String(p.id);markers.addLayer(marker)}
$('account').textContent=user?(roomId?'Carnet partagé · '+roomMembers.length+' membre(s)':'Connecté · carnet à choisir'):'Mode découverte';
$('authBtn').textContent=user?'Se déconnecter':'Se connecter';
}
function initMap(){
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
map=L.map('map',{scrollWheelZoom:!mobile,zoomControl:true,zoomAnimation:!mobile,fadeAnimation:!mobile,markerZoomAnimation:!mobile}).setView([48.8647,2.336],13);
let baseLayer=null,errors=0,loaded=0;
const status=$('mapStatus');
function loadTiles(){
if(baseLayer){baseLayer.off();map.removeLayer(baseLayer)}
errors=0;loaded=0;status.style.display='none';
baseLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19,keepBuffer:2,updateWhenIdle:mobile,
attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
baseLayer.on('tileload',()=>{loaded++;if(loaded>0)status.style.display='none'});
baseLayer.on('tileerror',()=>{if(++errors>=3&&loaded===0)status.style.display='block'});
baseLayer.addTo(map);
map.invalidateSize({pan:false});
}
$('reloadMap').addEventListener('click',loadTiles);
$('retryMap').addEventListener('click',loadTiles);
loadTiles();
markers=L.layerGroup().addTo(map);
let resizeScheduled=false;
function refreshMapSize(){
if(resizeScheduled)return;
resizeScheduled=true;
requestAnimationFrame(()=>{resizeScheduled=false;map.invalidateSize({pan:false,debounceMoveend:true});});
}
window.addEventListener('resize',refreshMapSize);
window.addEventListener('orientationchange',refreshMapSize);
window.addEventListener('pageshow',refreshMapSize);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMapSize()});
if('ResizeObserver' in window)new ResizeObserver(refreshMapSize).observe($('map'));
requestAnimationFrame(refreshMapSize);
map.whenReady(refreshMapSize);
map.on('click',e=>{if(!choosing)return;choosing=false;$('newLat').value=e.latlng.lat.toFixed(6);$('newLng').value=e.latlng.lng.toFixed(6);$('addDialog').showModal();alertUI('Coordonnées enregistrées. Complétez l’adresse puis validez.')});
}
function focusPlace(id){const p=allPlaces().find(x=>String(x.id)===String(id));if(!p)return;map.setView([p.lat,p.lng],16);markers.eachLayer(m=>{if(m.placeId===String(id))m.openPopup()});if(innerWidth<850)window.scrollTo({top:250,behavior:'smooth'})}
async function toggleVisit(id,checked){if(!active()){let ids=readLocal();ids=checked?[...new Set([...ids,id])]:ids.filter(v=>v!==id);saveLocal(ids);render();return}
try{const payload={room_id:roomId,place_id:id,user_id:user.id,visited:checked};const {error}=await db.from('place_visits').upsert(payload,{onConflict:'room_id,place_id,user_id'});if(error)throw error;visits=visits.filter(v=>!(v.place_id===id&&v.user_id===user.id));visits.push(payload);render()}catch(err){alertUI('Visite non sauvegardée : '+err.message,true);render()}}
async function refresh(){if(!active()||busy)return;try{const [p,v,m]=await Promise.all([db.from('custom_places').select('*').eq('room_id',roomId).order('created_at',{ascending:true}),db.from('place_visits').select('*').eq('room_id',roomId),db.from('room_members').select('room_id,user_id,display_name,joined_at').eq('room_id',roomId)]);for(const r of [p,v,m])if(r.error)throw r.error;custom=p.data||[];visits=v.data||[];roomMembers=m.data||[];render()}catch(e){alertUI('Synchronisation impossible : '+e.message,true)}}
async function loadRooms(){if(!user)return;const {data,error}=await db.from('room_members').select('room_id,display_name,joined_at').eq('user_id',user.id);if(error)throw error;const ids=(data||[]).map(x=>x.room_id);if(roomId&&!ids.includes(roomId))roomId=null;if(!roomId&&ids.length)roomId=ids[0]||null;return data||[]}
async function selectRoom(id){roomId=id;custom=[];visits=[];roomMembers=[];await refresh();$('groupDialog').close();alertUI('Carnet privé sélectionné. Les visites sont synchronisées avec vos amis.')}
function parseInvite(text){try{const url=new URL(text,location.href);const token=new URLSearchParams(url.hash.slice(1)).get('invite');if(token)return parseInvite(token)}catch{}const m=text.trim().match(/^([0-9a-f-]{36})\.([0-9a-f]{64})$/i);return m?{room:m[1],token:m[2]}:null}
function inviteLink(id,token){return location.origin+location.pathname+'#invite='+id+'.'+token}
function extractInvite(){let hash=new URLSearchParams(location.hash.slice(1)).get('invite');if(hash){pendingInvite=parseInvite(hash);if(pendingInvite){$('inviteInput').value=hash;alertUI('Invitation détectée. Connectez-vous puis rejoignez le carnet.')}history.replaceState(null,'',location.pathname+location.search)}}
function showGroup(){if(!user){$('authDialog').showModal();return}db.from('room_members').select('room_id,display_name,joined_at').eq('user_id',user.id).then(({data,error})=>{if(error){alertUI(error.message,true);return}const rooms=[...new Set((data||[]).map(x=>x.room_id))];$('groupList').innerHTML='<p class="help">Mes carnets ('+rooms.length+') :</p>'+rooms.map(id=>'<button type="button" class="secondary" style="margin:3px" data-room="'+escaped(id)+'">'+(id===roomId?'✓ ':'')+'Carnet '+id.slice(0,8)+'</button>').join('')+(roomId?'<p class="help">Carnet actif : '+roomId+' · membres : '+roomMembers.map(m=>escaped(m.display_name)).join(', ')+'</p><button class="secondary" id="rotateBtn">Créer un nouveau lien d’invitation</button>':'');$('groupInfo').textContent='Seuls les membres de votre groupe peuvent voir vos lieux personnalisés et les visites.';$('groupDialog').showModal()})}
async function auth(){if(!window.supabase){alertUI('La bibliothèque Supabase ne s’est pas chargée. Vérifiez votre connexion.',true);return}db=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data}=await db.auth.getUser();user=data?.user||null;db.auth.onAuthStateChange((_event,session)=>{const next=session?.user||null;if(next?.id!==user?.id){user=next;roomId=null;custom=[];visits=[];setTimeout(async()=>{if(user){try{await loadRooms();await refresh();if(pendingInvite)showGroup()}catch(err){alertUI(err.message,true)}}render()},0)}});if(user){try{await loadRooms();await refresh()}catch(e){alertUI(e.message,true)}}render();if(pendingInvite&&user)showGroup()}
function closeDialogs(){document.querySelectorAll('dialog').forEach(d=>d.close())}
document.addEventListener('DOMContentLoaded',async()=>{
initMap();render();extractInvite();await auth();
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeDialogs));
['search','category','status','district','budget'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('resetBtn').onclick=()=>{for(const id of ['category','status','district','budget'])$(id).value='all';$('search').value='';render()};
$('places').addEventListener('change',e=>{if(e.target.matches('[data-visit]'))toggleVisit(e.target.dataset.visit,e.target.checked)});
$('places').addEventListener('click',e=>{if(e.target.matches('[data-focus]'))focusPlace(e.target.dataset.focus)});
$('authBtn').onclick=async()=>{if(user){await db.auth.signOut();user=null;roomId=null;custom=[];visits=[];render();alertUI('Déconnexion effectuée. Mode découverte activé.')}else $('authDialog').showModal()};
$('authForm').onsubmit=async e=>{e.preventDefault();const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)alertUI(error.message,true);else{closeDialogs();alertUI('Connexion réussie. Bienvenue !');await loadRooms();await refresh();if(pendingInvite)showGroup();render()}};
$('signupBtn').onclick=async()=>{if(!$('email').value||!$('password').value){alertUI('Renseignez votre e-mail et un mot de passe.',true);return}const {error,data}=await db.auth.signUp({email:$('email').value.trim(),password:$('password').value});if(error)alertUI(error.message,true);else{closeDialogs();alertUI(data?.session?'Compte créé, vous êtes connecté.':'Compte créé. Consultez votre boîte mail pour confirmer votre inscription.')}};
$('groupBtn').onclick=showGroup;
$('groupList').onclick=async e=>{const btn=e.target.closest('[data-room]');if(btn)await selectRoom(btn.dataset.room);if(e.target.id==='rotateBtn'){if(!confirm('Renouveler le lien d’invitation ? L’ancien lien ne fonctionnera plus.'))return;const {data,error}=await db.rpc('rotate_invite',{p_room:roomId});if(error){alertUI(error.message,true);return}const link=inviteLink(roomId,data);try{await navigator.clipboard.writeText(link);alertUI('Nouveau lien privé copié. Partagez-le uniquement avec vos amis.')}catch{prompt('Copiez le lien privé :',link)}closeDialogs()}};
$('createGroupForm').onsubmit=async e=>{e.preventDefault();if(!user)return;const {data,error}=await db.rpc('create_room',{p_name:$('groupName').value.trim()});if(error){alertUI(error.message,true);return}await selectRoom(data.room_id);const link=inviteLink(data.room_id,data.invite_token);try{await navigator.clipboard.writeText(link);alertUI('Carnet créé ! Lien d’invitation copié. Conservez-le : il ne sera pas affiché à nouveau.')}catch{prompt('Conservez ce lien privé :',link)}};
$('joinGroupForm').onsubmit=async e=>{e.preventDefault();const inv=parseInvite($('inviteInput').value);if(!inv){alertUI('Lien d’invitation invalide.',true);return}const {error}=await db.rpc('join_room',{p_room:inv.room,p_token:inv.token,p_name:$('joinName').value.trim()});if(error){alertUI(error.message,true);return}pendingInvite=null;await selectRoom(inv.room)};
$('addBtn').onclick=()=>{if(!active()){alertUI('Pour ajouter un lieu partagé, connectez-vous et choisissez un carnet privé.',true);if(!user)$('authDialog').showModal();else showGroup();return}$('addDialog').showModal()};
$('pickCoords').onclick=()=>{choosing=true;$('addDialog').close();alertUI('Cliquez sur la carte pour placer votre nouveau lieu.')};
$('addForm').onsubmit=async e=>{e.preventDefault();if(!active())return;const payload={room_id:roomId,creator_id:user.id,name:$('newName').value.trim(),address:$('newAddress').value.trim(),category:$('newCategory').value,arrondissement:Number($('newDistrict').value),lat:Number($('newLat').value),lng:Number($('newLng').value),budget:Number($('newBudget').value),description:$('newDescription').value.trim()};if(!payload.name||!payload.address||payload.lat<48||payload.lat>49||payload.lng<2||payload.lng>3){alertUI('Veuillez saisir un nom, une adresse et un emplacement valide en région parisienne.',true);return}const {error}=await db.from('custom_places').insert(payload);if(error){alertUI(error.message,true);return}$('addForm').reset();closeDialogs();await refresh();alertUI('Lieu ajouté au carnet partagé.')};
$('exportBtn').onclick=()=>{const json=JSON.stringify({version:1,app:'Paris Élégance',places:custom,visits:active()?visits.filter(v=>v.user_id===user.id):readLocal().map(place_id=>({place_id,visited:true}))},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download='paris-elegance-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.places)||data.places.length>250)throw new Error('Format ou taille de fichier non reconnu');if(data.places.length&&!active())throw new Error('Connectez-vous à un carnet privé pour importer des lieux');let count=0;for(const p of data.places){if(typeof p.name!=='string'||typeof p.address!=='string'||!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lng)))continue;const record={room_id:roomId,creator_id:user.id,name:p.name.slice(0,120),address:p.address.slice(0,240),category:Object.hasOwn(CATS,p.category)?p.category:'other',arrondissement:Math.max(1,Math.min(20,Number(p.arrondissement)||1)),lat:Number(p.lat),lng:Number(p.lng),budget:Math.max(0,Math.min(4,Number(p.budget)||0)),description:String(p.description||'').slice(0,600)};const {error}=await db.from('custom_places').insert(record);if(error)throw error;count++}if(!data.places.length&&Array.isArray(data.visits)&&!active()){saveLocal(data.visits.filter(v=>v.visited).map(v=>String(v.place_id)));render()}else await refresh();alertUI('Import terminé : '+count+' lieu(x) ajouté(s).')}catch(err){alertUI('Import impossible : '+err.message,true)}finally{e.target.value=''}};
setInterval(()=>{if(user&&roomId&&!document.hidden)refresh()},5000);
});
