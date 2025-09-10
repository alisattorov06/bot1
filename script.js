// Telegram WebApp obyektini olish
const tg = window.Telegram.WebApp;
tg.expand(); // WebApp ni to'liq ochish

let userData = {
    balance: 0,
    level: 1,
    energy: 10,
    lastClick: null,
    energyReset: null,
    pubgId: "",
    refCode: "ref12345"
};

// Sahifalarni boshqarish
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetPage = btn.getAttribute('data-page');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(targetPage).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// API orqali ma'lumotlarni yuklash
async function loadUserData() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return;

    try {
        const res = await fetch(`/api/user/${userId}`);
        const data = await res.json();
        userData = data;
        updateUI();
    } catch (e) {
        console.error("Ma'lumot yuklanmadi:", e);
    }
}

function updateUI() {
    document.getElementById('balance').innerText = userData.balance.toFixed(1);
    document.getElementById('level').innerText = userData.level;
    document.getElementById('energy').innerText = userData.energy;
    document.getElementById('ref-link').innerText = `t.me/ucfarmbot?start=${userData.refCode}`;

    const clickBtn = document.getElementById('click-btn');
    const cooldownDiv = document.getElementById('cooldown');
    const boostBtn = document.getElementById('boost-btn');

    if (userData.energy <= 0) {
        clickBtn.disabled = true;
        clickBtn.style.opacity = 0.5;
        cooldownDiv.classList.remove('hidden');

        // Agar energiya tiklangan bo'lsa, qayta yoqish
        if (userData.energyReset && new Date() > new Date(userData.energyReset)) {
            userData.energy = 10;
            userData.energyReset = null;
            updateUI();
            saveUserData();
        }
    } else {
        clickBtn.disabled = false;
        clickBtn.style.opacity = 1;
        cooldownDiv.classList.add('hidden');
    }

    // Boost tugmasi: 20 balldan keyin ko'rinadi
    if (userData.balance >= 20) {
        boostBtn.classList.remove('hidden');
    } else {
        boostBtn.classList.add('hidden');
    }
}

// Bosish tugmasi
document.getElementById('click-btn').addEventListener('click', async () => {
    if (userData.energy <= 0) return;

    const clickValue = 0.1 + (userData.level - 1) * 0.01;
    userData.balance += clickValue;
    userData.energy -= 1;

    if (userData.energy === 0) {
        userData.energyReset = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 soat
    }

    updateUI();
    await saveUserData();
});

// Boost tugmasi
document.getElementById('boost-btn').addEventListener('click', async () => {
    if (userData.balance < 5) return;

    userData.balance -= 5;
    if (userData.energyReset) {
        const resetTime = new Date(userData.energyReset);
        resetTime.setHours(resetTime.getHours() - 1.5); // 2 soat -> 0.5 soat qoldi
        userData.energyReset = resetTime.toISOString();
    }
    updateUI();
    await saveUserData();
});

// UC ayirboshlash
document.querySelectorAll('.uc-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.uc-card').forEach(c => c.style.border = "1px solid #ffd700");
        card.style.border = "2px solid #ff4500";
        card.style.boxShadow = "0 0 10px #ff4500";
    });
});

document.getElementById('exchange-btn').addEventListener('click', async () => {
    const selectedCard = document.querySelector('.uc-card[style*="ff4500"]');
    if (!selectedCard) {
        alert("UC paketini tanlang!");
        return;
    }

    const cost = parseInt(selectedCard.getAttribute('data-cost'));
    const uc = selectedCard.getAttribute('data-uc');
    const pubgId = document.getElementById('pubg-id').value.trim();

    if (!pubgId) {
        alert("PUBG ID kiriting!");
        return;
    }

    if (userData.balance < cost) {
        alert("Balans yetarli emas!");
        return;
    }

    try {
        const userId = tg.initDataUnsafe?.user?.id;
        const res = await fetch('/api/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                pubg_id: pubgId,
                uc_amount: uc,
                cost: cost
            })
        });

        if (res.ok) {
            userData.balance -= cost;
            updateUI();
            await saveUserData();
            alert("✅ So‘rov yuborildi! Admin tasdiqlaydi.");
        } else {
            alert("Xatolik yuz berdi!");
        }
    } catch (e) {
        alert("Server bilan bog‘lanishda xato!");
    }
});

// Ma'lumotlarni serverga saqlash
async function saveUserData() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return;

    try {
        await fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                ...userData
            })
        });
    } catch (e) {
        console.error("Saqlashda xato:", e);
    }
}

// Dastlabki yuklash
loadUserData();
