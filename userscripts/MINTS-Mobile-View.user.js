// ==UserScript==
// @name         MINTS Mobile View
// @namespace    https://nipponeer.com/
// @version      0.2.1
// @description  iPhone向けMINTS表示補助。認証・送信・アップロード処理には介入せず、表示だけをスマホ向けに整えます。
// @author       Hiroshi Fukuma / Nipponeer Records
// @match        https://www.mints.courts.go.jp/*
// @match        https://mints.courts.go.jp/*
// @run-at       document-end
// @grant        none
// @noframes
// @downloadURL  https://raw.githubusercontent.com/npr2025/nipponeer-site/main/userscripts/MINTS-Mobile-View.user.js
// @updateURL    https://raw.githubusercontent.com/npr2025/nipponeer-site/main/userscripts/MINTS-Mobile-View.user.js
// ==/UserScript==

(() => {
  'use strict';

  if (!['www.mints.courts.go.jp','mints.courts.go.jp'].includes(location.hostname)) return;

  const STYLE_ID = 'mints-mobile-view-css';
  const TABLE_CLASS = 'mints-mobile-table';

  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important}
      body{min-width:0!important;max-width:100vw!important;overflow-x:hidden!important}
      *,*::before,*::after{box-sizing:border-box!important}
      img,svg,video,canvas{max-width:100%!important;height:auto!important}
      main,[role="main"],.container,.container-fluid,.content,.main,#content,#main{
        width:100%!important;max-width:100%!important;min-width:0!important
      }
      input:not([type="checkbox"]):not([type="radio"]),select,textarea{
        max-width:100%!important;min-height:44px!important;font-size:16px!important
      }
      button,input[type="button"],input[type="submit"],input[type="reset"],a.btn,.btn{
        min-height:44px!important;max-width:100%!important;white-space:normal!important;
        line-height:1.3!important;touch-action:manipulation
      }
      .modal,[role="dialog"]{max-width:100vw!important}
      .modal-dialog{width:calc(100vw - 20px)!important;max-width:560px!important;margin:10px auto!important}
      .modal-content{max-height:calc(100dvh - 20px)!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}

      @media(max-width:700px){
        body{font-size:16px!important}
        main,[role="main"],.container,.container-fluid,.content,.main,#content,#main{
          padding-left:10px!important;padding-right:10px!important
        }
        h1{font-size:clamp(1.35rem,6vw,1.8rem)!important;line-height:1.3!important;overflow-wrap:anywhere!important}
        h2{font-size:clamp(1.15rem,5vw,1.5rem)!important;line-height:1.35!important;overflow-wrap:anywhere!important}
        p,li,dt,dd,label,span,a{overflow-wrap:anywhere!important}
        .row,[class*="col-"]{min-width:0!important;max-width:100%!important}
        .table-responsive{width:100%!important;max-width:100%!important;overflow:visible!important}

        table.${TABLE_CLASS}{display:block!important;width:100%!important;max-width:100%!important;border:0!important;background:transparent!important}
        table.${TABLE_CLASS} thead{
          position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;
          overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important
        }
        table.${TABLE_CLASS} tbody,table.${TABLE_CLASS} tr,table.${TABLE_CLASS} td{
          display:block!important;width:100%!important;max-width:100%!important
        }
        table.${TABLE_CLASS} tr{
          margin:0 0 12px!important;padding:8px 12px!important;border:1px solid rgba(0,0,0,.2)!important;
          border-radius:10px!important;background:#fff!important;box-shadow:0 1px 4px rgba(0,0,0,.07)!important;overflow:hidden!important
        }
        table.${TABLE_CLASS} td{
          min-width:0!important;padding:9px 0!important;border-width:0 0 1px 0!important;border-style:solid!important;
          border-color:rgba(127,127,127,.22)!important;text-align:left!important;white-space:normal!important;overflow-wrap:anywhere!important
        }
        table.${TABLE_CLASS} td:last-child{border-bottom:0!important}
        table.${TABLE_CLASS} td::before{
          content:attr(data-mints-label);display:block!important;margin-bottom:3px!important;font-size:.78rem!important;
          font-weight:700!important;line-height:1.3!important;opacity:.68
        }
        table.${TABLE_CLASS} td[data-mints-label=""]::before{display:none!important}
        table.${TABLE_CLASS} td a,table.${TABLE_CLASS} td button,table.${TABLE_CLASS} td .btn{
          min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;max-width:100%!important
        }
        dl{display:grid!important;grid-template-columns:1fr!important;gap:0!important}
        dt{margin-top:10px!important;font-size:.82rem!important;opacity:.7}
        dd{margin-left:0!important;padding-bottom:8px!important;border-bottom:1px solid rgba(127,127,127,.18)!important}
      }

      @media(max-width:700px) and (prefers-color-scheme:dark){
        table.${TABLE_CLASS} tr{background:Canvas!important;color:CanvasText!important;border-color:rgba(127,127,127,.45)!important}
      }
    `;
    document.head.appendChild(style);
  }

  const cleanText = el => (el?.innerText || el?.textContent || '').replace(/\s+/g,' ').trim();

  function getHeaders(table) {
    if (table.tHead?.rows?.length) {
      return Array.from(table.tHead.rows[table.tHead.rows.length - 1].cells || []);
    }
    const first = table.rows?.[0];
    if (!first) return [];
    const cells = Array.from(first.cells || []);
    const thCount = cells.filter(cell => cell.tagName === 'TH').length;
    return thCount >= Math.ceil(cells.length / 2) ? cells : [];
  }

  function processTable(table) {
    if (!(table instanceof HTMLTableElement) || table.dataset.mintsMobileDone === '1') return;

    const headers = getHeaders(table);
    const rows = table.tBodies?.length
      ? Array.from(table.tBodies).flatMap(tbody => Array.from(tbody.rows))
      : Array.from(table.rows || []).slice(headers.length ? 1 : 0);

    const maxColumns = Math.max(headers.length,...rows.map(row => row.cells?.length || 0),0);
    if (!rows.length || maxColumns < 2) {
      table.dataset.mintsMobileDone = '1';
      return;
    }

    const labels = headers.map((header,index) => cleanText(header) || `項目 ${index + 1}`);
    rows.forEach(row => Array.from(row.cells || []).forEach((cell,index) => {
      cell.setAttribute('data-mints-label',labels[index] || '');
    }));

    table.classList.add(TABLE_CLASS);
    table.dataset.mintsMobileDone = '1';
  }

  function process(root=document) {
    if (root instanceof HTMLTableElement) processTable(root);
    root.querySelectorAll?.('table').forEach(processTable);
  }

  process(document);

  let scheduled = false;
  const observer = new MutationObserver(mutations => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) process(node);
        }
      }
    });
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',() => process(document),{passive:true});
})();
