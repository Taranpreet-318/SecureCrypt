// Build dial ticks around the vault ring
const dialRing = document.getElementById('dialRing');
if (dialRing){
  const total = 48;
  for (let i = 0; i < total; i++){
    const tick = document.createElement('div');
    tick.className = 'tick' + (i % 4 === 0 ? ' major' : '');
    tick.style.transform = `rotate(${(360/total)*i}deg)`;
    dialRing.appendChild(tick);
  }
}

// Build rivets around the vault door edge
const rivets = document.getElementById('rivets');
if (rivets){
  const rCount = 16, radius = 122;
  for (let i = 0; i < rCount; i++){
    const angle = (2*Math.PI/rCount)*i;
    const rv = document.createElement('div');
    rv.className = 'rivet';
    rv.style.left = (128 + radius*Math.cos(angle)) + 'px';
    rv.style.top = (128 + radius*Math.sin(angle)) + 'px';
    rivets.appendChild(rv);
  }
}
