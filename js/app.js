(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pages = $$('.page');
  const nav = $('#nav');
  const progress = $('#progress');
  const toast = $('#toast');

  let currentPage = 0;
  let maxUnlocked = 0;
  let transitioning = false;
  let toastTimer = null;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // النجوم الخلفية
  const starfield = $('#stars');
  const starCount = window.matchMedia('(max-width: 700px)').matches ? 65 : 115;
  const starFragment = document.createDocumentFragment();
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('i');
    star.className = 'star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.opacity = String(.2 + Math.random() * .8);
    star.style.setProperty('--d', `${2 + Math.random() * 4}s`);
    starFragment.appendChild(star);
  }
  starfield.appendChild(starFragment);

  // نظام الفصول: لا يمكن تجاوز مرحلة لم تكتمل.
  pages.forEach((page, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.title = `المرحلة ${index + 1}`;
    dot.setAttribute('aria-label', `الانتقال إلى المرحلة ${index + 1}`);
    dot.disabled = index > maxUnlocked;
    dot.addEventListener('click', () => go(index));
    nav.appendChild(dot);
  });

  function updateNavigation() {
    [...nav.children].forEach((dot, index) => {
      dot.classList.toggle('active', index === currentPage);
      dot.disabled = index > maxUnlocked;
      dot.setAttribute('aria-current', index === currentPage ? 'step' : 'false');
    });
    progress.style.width = `${((currentPage + 1) / pages.length) * 100}%`;
  }

  function unlockThrough(index) {
    maxUnlocked = Math.max(maxUnlocked, Math.min(index, pages.length - 1));
    updateNavigation();
  }

  function go(index) {
    if (transitioning || index === currentPage || index < 0 || index >= pages.length) return;
    if (index > maxUnlocked) {
      notify('أكملي التحدي الحالي أولًا لتُفتح المرحلة التالية ✨');
      return;
    }
    transitioning = true;
    const transition = $('#transition');
    transition.className = '';
    void transition.offsetWidth;
    transition.classList.add('go');
    setTimeout(() => {
      pages[currentPage].classList.remove('active');
      currentPage = index;
      pages[currentPage].classList.add('active');
      updateNavigation();
      transition.classList.add('leave');
      setTimeout(() => {
        transition.className = '';
        transitioning = false;
      }, 560);
    }, 620);
  }

  $$('[data-next]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.unlock) unlockThrough(Number(button.dataset.unlock));
      go(Number(button.dataset.next));
    });
  });

  // مؤثرات الاحتفال
  function confetti() {
    const colors = ['#f4d58a', '#e6a9d2', '#b99aff', '#fff1c2'];
    const fragment = document.createDocumentFragment();
    const pieces = [];
    for (let i = 0; i < 46; i++) {
      const piece = document.createElement('i');
      piece.style.cssText = `position:fixed;z-index:55;top:-12px;left:${Math.random() * 100}vw;width:6px;height:11px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none`;
      fragment.appendChild(piece);
      pieces.push(piece);
    }
    document.body.appendChild(fragment);
    pieces.forEach(piece => {
      const x = (Math.random() - .5) * 210;
      const y = window.innerHeight + 60;
      const duration = 1700 + Math.random() * 1400;
      const animation = piece.animate(
        [{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
         { transform: `translate(${x}px,${y}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }],
        { duration, easing: 'cubic-bezier(.2,.7,.3,1)' }
      );
      animation.onfinish = () => piece.remove();
    });
  }

  // صندوق الأحجار: السحب إلى الفتحة الصحيحة فقط، ثم إظهار الصفات بعد فتحه بالكامل.
  const lockSteps = [
    { color: 'gold', label: 'حجر ذهبي', trait: 'الحنية', desc: 'قلبكِ حنين ووجودكِ دايمًا يطمن ويريّح اللي حواليكِ.' },
    { color: 'pink', label: 'حجر وردي', trait: 'الضحكة الحلوة', desc: 'ضحكتكِ بتغيّر مزاج اليوم كله وتنور المكان.' },
    { color: 'violet', label: 'حجر بنفسجي', trait: 'الجدعنة', desc: 'سند وموجودة في وقت الجد قبل الفرح، وده سر تميزك.' }
  ];
  let lockStep = 0;
  let draggedStone = null;
  const stoneButtons = $$('.color-stone');
  const lockSlots = $$('.lock-slot');

  function syncLockUI() {
    lockSlots.forEach((slot, index) => {
      slot.classList.toggle('solved', index < lockStep);
      slot.classList.toggle('active-target', index === lockStep && lockStep < 3);
      const small = $('small', slot);
      if (index < lockStep) small.textContent = 'تم تركيب الحجر ✓';
      else if (index === lockStep) small.textContent = 'ضعي الحجر المطابق هنا';
      else small.textContent = 'في الانتظار';
    });
    $('#chestStatus').textContent = lockStep < 3
      ? `الصندوق مغلق · القفل ${lockStep + 1} من 3: ${lockSteps[lockStep].label}`
      : 'انفتح الصندوق! ظهرت الصفات الثلاث ✨';
  }

  function placeStone(color, slot) {
    if (!slot || lockStep >= 3) return;
    const expected = lockSteps[lockStep];
    if (Number(slot.dataset.step) !== lockStep || color !== expected.color) {
      $('#chestStatus').textContent = `الحجر مش في مكانه الصحيح. المطلوب: ${expected.label}`;
      slot.classList.remove('shake');
      void slot.offsetWidth;
      slot.classList.add('shake');
      return;
    }
    const stone = stoneButtons.find(item => item.dataset.color === color);
    if (stone) { stone.disabled = true; stone.classList.add('placed'); }
    $('.socket-dot', slot).textContent = '✓';
    slot.classList.add('solved');
    lockStep++;
    syncLockUI();
    if (lockStep === 3) {
      $('#treasureChest').classList.add('opened');
      $('#unlockedTraits').hidden = false;
      lockSteps.forEach((item, index) => {
        const card = $(`[data-trait-slot="${index}"]`);
        const title = document.createElement('b');
        const desc = document.createElement('small');
        title.textContent = item.trait;
        desc.textContent = item.desc;
        card.replaceChildren(title, desc);
        card.classList.add('revealed');
      });
      $('#wishNext').disabled = false;
      unlockThrough(3);
      confetti();
    }
  }

  stoneButtons.forEach(stone => {
    stone.addEventListener('dragstart', event => {
      if (stone.disabled) return;
      draggedStone = stone.dataset.color;
      event.dataTransfer.setData('text/plain', draggedStone);
      event.dataTransfer.effectAllowed = 'move';
    });
    stone.addEventListener('click', () => {
      if (stone.disabled) return;
      const target = lockSlots[lockStep];
      if (target) placeStone(stone.dataset.color, target);
    });
    // دعم السحب باللمس عبر Pointer Events
    stone.addEventListener('pointerdown', event => {
      if (stone.disabled || event.pointerType === 'mouse') return;
      draggedStone = stone.dataset.color;
      stone.setPointerCapture(event.pointerId);
    });
    stone.addEventListener('pointerup', event => {
      if (!draggedStone || event.pointerType === 'mouse') return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.lock-slot');
      if (target) placeStone(draggedStone, target);
      draggedStone = null;
    });
  });
  lockSlots.forEach(slot => {
    slot.addEventListener('dragover', event => { event.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', event => {
      event.preventDefault();
      slot.classList.remove('drag-over');
      const color = event.dataTransfer.getData('text/plain') || draggedStone;
      if (color) placeStone(color, slot);
      draggedStone = null;
    });
  });
  syncLockUI();

  // كوكبة إسراء
  const starSecrets = [
    { symbol: 'إ', name: 'نجمة إ', message: 'إشراقة حضوركِ وحدها تغيّر مزاج اليوم كله للأجمل.' },
    { symbol: 'س', name: 'نجمة س', message: 'سعادة وسكينة تملى قلبكِ في كل أيامكِ الجاية.' },
    { symbol: 'ر', name: 'نجمة ر', message: 'رقة قلبكِ وجمال روحكِ هما سر تميزكِ في كل مكان.' },
    { symbol: 'ا', name: 'نجمة ا', message: 'أمل كبير إن كل خطوة بتاخديها تقرّبكِ من أحلامكِ.' },
    { symbol: 'ء', name: 'نجمة ء', message: 'نور يرافق طريقكِ ويجعل كل بداية جديدة أجمل.' },
    { symbol: '✦', name: 'نجمة السحر', message: 'لمسة سحر خاصة تكمّل كوكبة إسراء في سماء الليلة.' }
  ];
  const chosenStars = [];
  const targetSequence = [0, 1, 2, 3, 4];

  $$('.sky-star').forEach(button => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const index = Number(button.dataset.star);
      if (chosenStars.length >= targetSequence.length || chosenStars.includes(index)) return;
      const expected = targetSequence[chosenStars.length];
      if (index !== expected) {
        $('#starReveal').textContent = `ابدئي بالترتيب: الحرف المطلوب الآن هو (${starSecrets[expected].symbol}) ✨`;
        button.classList.remove('shake');
        void button.offsetWidth;
        button.classList.add('shake');
        return;
      }
      chosenStars.push(index);
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      $('#starCount').textContent = `✦ ${chosenStars.length} / 5 حروف`;
      $('#starReveal').textContent = `✧ ${starSecrets[index].name}: ${starSecrets[index].message}`;
      const points = chosenStars.map(starIndex => {
        const element = $(`.sky-star[data-star="${starIndex}"]`);
        const x = parseFloat(element.style.getPropertyValue('--x')) / 100 * 600;
        const y = parseFloat(element.style.getPropertyValue('--y')) / 100 * 300;
        return `${x},${y}`;
      }).join(' ');
      const lines = $('#starLines');
      lines.setAttribute('points', points);
      lines.classList.remove('drawn');
      void lines.getBoundingClientRect();
      lines.classList.add('drawn');
      if (chosenStars.length === targetSequence.length) {
        $$('.sky-star:not(.selected)').forEach(star => star.disabled = true);
        $('#starCount').textContent = '✦ اكتمل اسم إسراء';
        $('#starReveal').textContent = 'أحسنتِ! رتبتِ حروف اسم إسراء وظهرت كوكبتكِ ✨';
        const summary = $('#chosenConstellationSummary');
        summary.textContent = `✦ كوكبة إسراء: ${chosenStars.map(i => starSecrets[i].symbol).join(' · ')}`;
        summary.hidden = false;
        unlockThrough(5);
        setTimeout(() => { $('#constellationResult').hidden = false; confetti(); }, 650);
      }
    });
  });

  // الشمعة والمايكروفون
  let micStream = null;
  let micContext = null;
  let micFrame = null;
  let micListening = false;
  let candleBlown = false;

  function stopMic() {
    micListening = false;
    if (micFrame) cancelAnimationFrame(micFrame);
    micFrame = null;
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    micStream = null;
    if (micContext) micContext.close().catch(() => {});
    micContext = null;
    $('#micMeter').hidden = true;
    $('#micBar').style.width = '0%';
    $('#micBlowBtn').textContent = 'النفخ بالمايك 🎤';
  }

  function blowCandle() {
    if (candleBlown) return;
    candleBlown = true;
    stopMic();
    $('#cake').classList.add('off', 'smoking');
    setTimeout(() => $('#cake').classList.remove('smoking'), 2200);
    $('#cakeText').textContent = 'أمنيتكِ انطلقت إلى السماء… أتمنى أن تتحقق كلها 🤍';
    $('#blow').hidden = true;
    $('#micBlowBtn').hidden = true;
    $('#cakeNext').hidden = false;
    unlockThrough(6);
    confetti();
  }

  $('#blow').addEventListener('click', blowCandle);
  $('#micBlowBtn').addEventListener('click', async () => {
    if (candleBlown) return;
    if (micListening) {
      stopMic();
      $('#cakeText').textContent = 'تم إيقاف المايكروفون. يمكنكِ استخدام زر إطفاء الشمعة.';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      notify('الميكروفون غير متاح في هذا المتصفح؛ استخدمي زر إطفاء الشمعة.');
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('AudioContext unavailable');
      micContext = new AudioContextClass();
      const source = micContext.createMediaStreamSource(micStream);
      const analyser = micContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      micListening = true;
      $('#micMeter').hidden = false;
      $('#micBlowBtn').textContent = 'إيقاف المايك ⏹';
      $('#cakeText').textContent = 'المايك شغال… انفخي بقوة لإطفاء الشمعة 🌬️';
      let blowFrames = 0;
      const tick = () => {
        if (!micListening || candleBlown) return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const average = sum / data.length;
        $('#micBar').style.width = `${Math.min(100, Math.round(average / 95 * 100))}%`;
        if (average > 48) {
          blowFrames++;
          if (blowFrames >= 5) {
            blowCandle();
            return;
          }
        } else {
          blowFrames = Math.max(0, blowFrames - 1);
        }
        micFrame = requestAnimationFrame(tick);
      };
      tick();
    } catch (error) {
      stopMic();
      $('#cakeText').textContent = 'لم يتم تفعيل المايكروفون؛ اضغطي على زر إطفاء الشمعة ✨';
      notify('تأكدي من السماح باستخدام المايكروفون وفتح الموقع عبر HTTPS أو localhost.');
    }
  });

  // الموسيقى من ملف ثابت داخل assets؛ يبدأ التشغيل بعد أول تفاعل من المستخدم.
  const audio = $('#birthdaySong');
  const soundButton = $('#sound');
  let audioPlaying = false;
  function setSoundIcon(playing) {
    audioPlaying = playing;
    soundButton.textContent = playing ? '♫' : '♪';
    soundButton.setAttribute('aria-label', playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
    soundButton.title = playing ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى';
  }
  async function startAudio() {
    try {
      await audio.play();
      setSoundIcon(true);
    } catch {
      setSoundIcon(false);
      notify('أضيفي ملف الموسيقى باسم birthday-song.mp3 داخل مجلد assets لتشغيله.');
    }
  }
  $('#enterBtn').addEventListener('click', () => {
    unlockThrough(1);
    go(1);
    startAudio();
  });
  soundButton.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); setSoundIcon(false); }
    else await startAudio();
  });
  audio.addEventListener('ended', () => setSoundIcon(false));

  // العمر والعد التنازلي
  function getAgeParts(birth, now) {
    let years = now.getFullYear() - birth.getFullYear();
    let anniversary = new Date(birth);
    anniversary.setFullYear(birth.getFullYear() + years);
    if (anniversary > now) {
      years--;
      anniversary = new Date(birth);
      anniversary.setFullYear(birth.getFullYear() + years);
    }
    let months = 0;
    let cursor = new Date(anniversary);
    while (true) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      if (next <= now) { months++; cursor = next; }
      else break;
    }
    let remainder = Math.max(0, now - cursor);
    const days = Math.floor(remainder / 86400000); remainder %= 86400000;
    const hours = Math.floor(remainder / 3600000); remainder %= 3600000;
    const minutes = Math.floor(remainder / 60000);
    const seconds = Math.floor((remainder % 60000) / 1000);
    return { years, months, days, hours, minutes, seconds };
  }

  function updateBirthdayClocks() {
    const now = new Date();
    const birth = new Date(2005, 10, 20, 0, 0, 0);
    const age = getAgeParts(birth, now);
    $('#ageCounter').textContent = `العمر: ${age.years} سنة · ${age.months} شهر · ${age.days} يوم · ${age.hours} ساعة · ${age.minutes} دقيقة · ${age.seconds} ثانية`;

    let nextBirthday = new Date(now.getFullYear(), 10, 20, 0, 0, 0);
    if (nextBirthday <= now) nextBirthday = new Date(now.getFullYear() + 1, 10, 20, 0, 0, 0);
    let difference = Math.max(0, nextBirthday - now);
    const days = Math.floor(difference / 86400000); difference %= 86400000;
    const hours = Math.floor(difference / 3600000); difference %= 3600000;
    const minutes = Math.floor(difference / 60000); difference %= 60000;
    const seconds = Math.floor(difference / 1000);
    $('#birthdayCountdown').textContent = `المتبقي لعيد الميلاد القادم: ${days} يوم · ${hours} ساعة · ${minutes} دقيقة · ${seconds} ثانية`;
  }

  // إعادة الحكاية من البداية
const restartBtn = $('#restartBtn');

restartBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    stopMic();

    // إيقاف الموسيقى وإرجاعها للبداية
    const audio = $('#birthdaySong');

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    // إعادة تحميل التجربة من البداية
    window.location.reload();
});

  // لمسات خفيفة للمؤشر، مع تعطيلها على الأجهزة اللمسية لتقليل الحمل.
  if (window.matchMedia('(pointer:fine) and (prefers-reduced-motion: no-preference)').matches) {
    let lastSpark = 0;
    document.addEventListener('pointermove', event => {
      const now = performance.now();
      if (now - lastSpark < 95) return;
      lastSpark = now;
      const spark = document.createElement('span');
      spark.className = 'trail-spark';
      spark.textContent = ['✦', '✧', '·'][Math.floor(Math.random() * 3)];
      spark.style.left = `${event.clientX}px`;
      spark.style.top = `${event.clientY}px`;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 850);
    }, { passive: true });
  }

  document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && micListening) {
    stopMic();
  }
});

  window.addEventListener('pagehide', () => {
    stopMic();
    stopSynth();
    if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
  });

  updateNavigation();
  updateBirthdayClocks();
  setInterval(updateBirthdayClocks, 1000);
})();
