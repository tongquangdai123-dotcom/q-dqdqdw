// ==UserScript==
// @name         Discord Auto Register - Enhanced UI
// @namespace    http://tampermonkey.net/
// @version      13.1
// @description  Tự động tạo tài khoản Discord với toast notification cải tiến và panel có thể đóng/mở
// @match        https://discord.com/register*
// @match        https://discord.com/channels/*
// @match        https://discord.com/verify*
// @grant        GM_xmlhttpRequest
// @connect      email.devtai.net
// @connect      localhost
// @connect      127.0.0.1
// @connect      click.discord.com
// ==/UserScript==

(async () => {
    'use strict';

    const CFG = {
        SERVER: 'http://localhost:5000',
        PASS: '939945729',
        API: 'https://email.devtai.net/api',
        DOMAINS: ['epmtyfl.me', 'sptech.io.vn'],
        INTERVAL: 5004,
        MAX: 24
    };

    const state = { 
        email: '', 
        user: '', 
        count: 0, 
        checking: false,
        panelOpen: true 
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    const makeToastContainer = () => {
        if ($('#toast-container')) return;
        
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            pointer-events: none;
        `;
        document.body.appendChild(div);
    };

    const toast = (msg, color = 'linear-gradient(135deg,#667eea,#764ba2)', dur = 4000) => {
        makeToastContainer();
        
        const el = document.createElement('div');
        el.style.cssText = `
            background: ${color};
            color: #fff;
            padding: 12px 20px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 
                0 8px 24px rgba(0,0,0,.3),
                0 0 0 1px rgba(255,255,255,.1) inset;
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
            transition: all .4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: auto;
            cursor: pointer;
            min-width: 240px;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `position: relative; z-index: 1;`;
        content.innerHTML = msg;
        el.appendChild(content);
        
        el.onclick = () => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-20px) scale(0.9)';
            setTimeout(() => el.remove(), 300);
        };
        
        $('#toast-container').appendChild(el);
        
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scale(1)';
        });
        
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-20px) scale(0.9)';
            setTimeout(() => el.remove(), 400);
        }, dur);
    };

    const info = msg => toast(msg, 'linear-gradient(135deg,#3b82f6,#60a5fa)');
    const success = msg => toast(msg, 'linear-gradient(135deg,#10b981,#34d399)');
    const error = msg => toast(msg, 'linear-gradient(135deg,#ef4444,#f87171)');
    const warn = msg => toast(msg, 'linear-gradient(135deg,#f59e0b,#fbbf24)');

    const api = (method, url, data) => new Promise(resolve => {
        GM_xmlhttpRequest({
            method,
            url,
            headers: { 'Content-Type': 'application/json' },
            data: data ? JSON.stringify(data) : undefined,
            timeout: 10000,
            onload: r => {
                try {
                    resolve({ ok: true, data: JSON.parse(r.responseText) });
                } catch {
                    resolve({ ok: false });
                }
            },
            onerror: () => resolve({ ok: false }),
            ontimeout: () => resolve({ ok: false })
        });
    });

    const genUsername = () => `shoptokenhmk_${Math.floor(Math.random() * 1000000)}`;
    
    const genEmail = () => {
        const d = CFG.DOMAINS[~~(Math.random() * CFG.DOMAINS.length)];
        const s = Array(8).fill().map(() => 'abcdefghijklmnopqrstuvwxyz0123456789'[~~(Math.random() * 36)]).join('');
        const p = ~~(Math.random() * (s.length + 1));
        return `${s.slice(0, p)}hmkcte${s.slice(p)}@${d}`;
    };

    const getToken = () => {
        try {
            const t = (webpackChunkdiscord_app.push([[''], {}, e => { m = []; for (let c in e.c) m.push(e.c[c]); }]), m)
                .find(m => m?.exports?.default?.getToken !== void 0).exports.default.getToken();
            if (t) return t;
        } catch { }
        for (let k in localStorage) {
            if (k.includes('token')) {
                const v = localStorage[k];
                if (typeof v === 'string' && v.length > 50) return v.replace(/\"/g, '');
            }
        }
        return null;
    };

    const extractLink = (txt, html) => {
        const m1 = txt.match(/https:\/\/click\.discord\.com\/ls\/click\?upn=[^\s\n]+/);
        if (m1) return m1[0];
        const m2 = html.match(/href="(https:\/\/click\.discord\.com\/ls\/click\?upn=[^"]+)"/);
        return m2 ? m2[1].replace(/&amp;/g, '&') : null;
    };

    const checkEmail = async () => {
        if (state.checking || !state.email) return;
        state.checking = true;
        state.count++;

        try {
            const r = await api('GET', `${CFG.API}/email/${state.email}`);

            if (r.ok && r.data?.length > 0) {
                const msg = r.data.find(m => m.fromAddress?.includes('discord.com') && 
                    (m.subject?.includes('Verify') || m.subject?.includes('Xác')));

                if (msg) {
                    const full = await api('GET', `${CFG.API}/inbox/${msg.id}`);

                    if (full.ok) {
                        const link = extractLink(full.data.textContent || '', full.data.htmlContent || '');

                        if (link) {
                            let token = getToken();
                            for (let i = 0; !token && i < 3; i++) {
                                await sleep(500);
                                token = getToken();
                            }

                            if (token) {
                                await api('POST', `${CFG.SERVER}/api/save-token`, {
                                    email: state.email,
                                    username: state.user,
                                    password: CFG.PASS,
                                    token,
                                    verified: false
                                });
                            }

                            localStorage.setItem('v_prev', window.location.href);
                            localStorage.setItem('v_progress', 'true');
                            localStorage.setItem('v_email', state.email);
                            localStorage.setItem('v_user', state.user);
                            window.open(link, '_blank');
                            return;
                        }
                    }
                }
            }

            if (state.count < CFG.MAX) setTimeout(checkEmail, CFG.INTERVAL);
        } catch {
            if (state.count < CFG.MAX) setTimeout(checkEmail, CFG.INTERVAL);
        } finally {
            state.checking = false;
        }
    };

    const setInput = (el, val) => {
        if (!el) return;
        Object.getOwnPropertyDescriptor(el.__proto__, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const selectDD = async (sel, txt) => {
        const dd = $(sel);
        if (!dd) return false;
        dd.click();
        await sleep(500);
        const opt = Array.from($$('div[role="option"]')).find(o => o.textContent.trim().toLowerCase() === txt.toLowerCase());
        if (opt) {
            opt.click();
            return true;
        }
        return false;
    };

    const fillDOB = async () => {
        await selectDD('div[aria-label="Ngày"]', (1 + ~~(Math.random() * 28)).toString());
        await sleep(300);
        await selectDD('div[aria-label="Tháng"]', `tháng ${1 + ~~(Math.random() * 12)}`);
        await sleep(300);
        await selectDD('div[aria-label="Năm"]', (1990 + ~~(Math.random() * 16)).toString());
    };

    const startReg = async () => {
        state.email = genEmail();
        state.user = genUsername();
        localStorage.setItem('p_email', state.email);
        localStorage.setItem('p_user', state.user);
        await sleep(500);

        setInput($('input[type="email"]'), state.email);
        setInput($('input[aria-label="Tên hiển thị"]'), 'Shop Token Phan Nguyen Đăng Khoa');
        setInput($('input[aria-label="Tên đăng nhập"]'), state.user);
        setInput($('input[aria-label="Mật khẩu"]'), CFG.PASS);

        await fillDOB();
    };

    const clearData = async () => {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(';').forEach(c => {
            const n = c.split('=')[0].trim();
            document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.discord.com`;
        });

        if (window.indexedDB) {
            const dbs = await window.indexedDB.databases();
            await Promise.all(dbs.map(db => db.name ? window.indexedDB.deleteDatabase(db.name) : null));
        }

        success('✨ Dữ liệu cũ đã được xóa!');
    };

    const newAcc = async () => {
        await clearData();
        localStorage.removeItem('v_done');
        window.location.href = 'https://discord.com/register';
    };

    const verify = async () => {
        if (localStorage.getItem('v_progress') !== 'true') return;
        
        const email = localStorage.getItem('v_email');
        const user = localStorage.getItem('v_user');
        if (!email) return;

        info('⏳ Đang chờ xác nhận verify...');

        const check = setInterval(async () => {
            const txt = document.body.textContent;
            
            if (txt.includes('phone') || txt.includes('Phone') || 
                txt.includes('điện thoại') || txt.includes('Điện thoại') ||
                txt.includes('số điện thoại')) {
                clearInterval(check);
                error('📱 Tài khoản yêu cầu xác minh điện thoại. Bỏ qua!');
                
                localStorage.removeItem('v_progress');
                localStorage.removeItem('v_email');
                localStorage.removeItem('v_user');
                localStorage.removeItem('p_email');
                localStorage.removeItem('p_user');
                
                setTimeout(() => {
                    window.location.href = 'https://discord.com/channels/@me';
                }, 2000);
                return;
            }
            
            if (txt.includes('Đã Được Xác Nhận') || txt.includes('Verified') || txt.includes('Tiếp tục')) {
                clearInterval(check);

                success('✅ Verify thành công!');

                await api('POST', `${CFG.SERVER}/api/update-verified`, {
                    email,
                    username: user,
                    password: CFG.PASS,
                    verified: true
                });

                localStorage.setItem('v_done', 'true');
                localStorage.removeItem('v_progress');
                localStorage.removeItem('v_email');
                localStorage.removeItem('v_user');

                const prev = localStorage.getItem('v_prev') || 'https://discord.com/channels/@me';
                localStorage.removeItem('v_prev');

                await sleep(1500);
                window.location.href = prev;
            }
        }, 800);

        setTimeout(() => clearInterval(check), 30000);
    };

    const channels = async () => {
        if (localStorage.getItem('v_done') === 'true') {
            success('✅ Tài khoản đã được verify thành công!');
            return;
        }

        const email = localStorage.getItem('p_email') || localStorage.getItem('v_email');
        const user = localStorage.getItem('p_user') || localStorage.getItem('v_user');
        if (!email) return;

        state.email = email;
        state.user = user;
        state.count = 0;
        state.checking = false;
        
        setTimeout(checkEmail, 2000);
    };

    const manualVerify = async () => {
        const email = localStorage.getItem('p_email') || localStorage.getItem('v_email');
        const user = localStorage.getItem('p_user') || localStorage.getItem('v_user');
        
        if (!email) {
            error('❌ Không tìm thấy thông tin email!');
            return;
        }

        localStorage.removeItem('v_done');
        localStorage.removeItem('v_progress');

        info('🔄 Đang kiểm tra email verify...');
        state.email = email;
        state.user = user;
        state.count = 0;
        state.checking = false;
        
        await checkEmail();
    };

    const togglePanel = () => {
        state.panelOpen = !state.panelOpen;
        const content = $('#panel-content');
        const toggle = $('#panel-toggle');
        const panel = $('#control-panel');
        
        if (state.panelOpen) {
            content.style.maxHeight = '400px';
            content.style.opacity = '1';
            content.style.padding = '12px 15px';
            toggle.innerHTML = '▼';
        } else {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            content.style.padding = '0 15px';
            toggle.innerHTML = '▲';
        }
    };

    const panel = () => {
        const p = document.createElement('div');
        const isC = location.pathname.includes('/channels/');
        
        p.id = 'control-panel';
        p.innerHTML = `
            <div id="panel-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 15px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 12px 12px 0 0;
                cursor: pointer;
                user-select: none;
            ">
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    color: #fff;
                    text-shadow: 0 1px 4px rgba(0,0,0,.3);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    <span style="font-size: 16px;">🎄</span>
                    <span>Phan Nguyễn Đăng Khoa reg token</span>
                </div>
                <button id="panel-toggle" style="
                    background: rgba(255,255,255,.2);
                    border: 1px solid rgba(255,255,255,.3);
                    color: #fff;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: bold;
                    transition: all .3s;
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">▼</button>
            </div>
            <div id="panel-content" style="
                max-height: 300px;
                opacity: 1;
                overflow: hidden;
                transition: all .4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                padding: 12px 15px;
                background: rgba(255,255,255,.95);
                border-radius: 0 0 12px 12px;
                backdrop-filter: blur(20px);
            ">
                ${isC ? `
                    <div style="
                        background: linear-gradient(135deg,#10b981,#34d399);
                        padding: 10px 12px;
                        border-radius: 10px;
                        margin-bottom: 10px;
                        color: #fff;
                        box-shadow: 0 4px 16px rgba(16,185,129,.3);
                        font-size: 11px;
                    ">
                        <div style="margin-bottom: 4px;">
                            <strong>📧</strong> <span id="em-display" style="opacity: 0.95;">-</span>
                        </div>
                        <div>
                            <strong>👤</strong> <span id="us-display" style="opacity: 0.95;">-</span>
                        </div>
                    </div>
                ` : ''}
                <button id="btn-start" style="
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg,#3b82f6,#60a5fa);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(59,130,246,.4);
                    transition: all .3s;
                    border: 1px solid rgba(255,255,255,.3);
                ">
                    ${isC ? '🔄 Tạo Tài Khoản Mới' : '🦖Bắt Đầu Đăng Ký'}
                </button>
            </div>
        `;

        p.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 999998;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            width: 280px;
            box-shadow: 
                0 10px 40px rgba(0,0,0,.25),
                0 0 0 1px rgba(255,255,255,.1) inset;
            border-radius: 12px;
            overflow: hidden;
            transition: all .4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;

        if (!$('#panel-animations')) {
            const style = document.createElement('style');
            style.id = 'panel-animations';
            style.textContent = `
                #panel-toggle:hover {
                    background: rgba(255,255,255,.3);
                    transform: scale(1.1);
                }
                #btn-start:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(59,130,246,.6);
                }
                #btn-start:active {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(p);

        $('#panel-header').addEventListener('click', togglePanel);
        $('#panel-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel();
        });

        if (isC) {
            $('#em-display').textContent = localStorage.getItem('p_email') || localStorage.getItem('v_email') || '-';
            $('#us-display').textContent = localStorage.getItem('p_user') || localStorage.getItem('v_user') || '-';
            $('#btn-start').addEventListener('click', newAcc);
        } else {
            $('#btn-start').addEventListener('click', startReg);
        }
    };

    const init = () => {
        const path = location.pathname;
        
        if (path.includes('/register')) {
            setTimeout(panel, 1000);
        } else if (path.includes('/verify')) {
            verify();
        } else if (path.includes('/channels')) {
            setTimeout(panel, 1000);
            channels();
        }
    };

    init();
})();