/**
 * Client half of dsh-sidebar-todo — data model v2.
 *
 * Left-sidebar "待办" page with a list rail (smart views, lists, tags), a task
 * list, and an in-page detail drawer. The Host owns the data; this page posts
 * operations to `/dsh-sidebar-todo/state` and re-reads the whole store, so an
 * item the agent adds appears here on the next poll.
 *
 * The module is wrapped in an IIFE: the Client loader concatenates plugin
 * scripts, and top-level declarations would collide with other plugins.
 */
;(() => {
  const PANEL_ID = 'dsh-sidebar-todo'
  const ROUTE_STATE = '/dsh-sidebar-todo/state'
  const DAY = 86400000
  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const MODES = ['list', 'board', 'calendar', 'matrix', 'stats']
  const NOTIFIED_KEY = 'dsh-sidebar-todo:notified'

  window.__ModuleLoader__.load({
    id: '@magic_01/dsh-sidebar-todo',
    factory(require) {
      const React = require('react')
      const h = React.createElement

      const C = {
        bg: 'var(--dsw-alias-bg-base)',
        border: 'var(--dsw-alias-border-l1)',
        text: 'var(--dsw-alias-label-primary)',
        dim: 'var(--dsw-alias-label-secondary)',
        accent: 'var(--dsw-alias-brand-primary, currentColor)',
      }

      const CSS = `
.dsh-todo-page{position:relative;display:flex;height:100%;min-height:0;background:${C.bg};color:${C.text};font-size:13px;line-height:1.5}
.dsh-todo-page :focus-visible{outline:2px solid var(--dsw-focus-ring-color, ${C.accent});outline-offset:1px}
.dsh-todo-rail{flex:0 0 184px;min-width:0;border-right:1px solid ${C.border};padding:12px 8px;overflow:auto;display:flex;flex-direction:column;gap:14px}
.dsh-todo-rail-title{font-size:11px;font-weight:600;color:${C.dim};letter-spacing:.02em;padding:0 8px;display:flex;align-items:center}
.dsh-todo-rail-title button{margin-left:auto;border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:14px;line-height:16px;padding:0 2px;font-family:inherit}
.dsh-todo-rail-title button:hover{color:${C.text}}
.dsh-todo-nav{display:flex;flex-direction:column;gap:1px}
.dsh-todo-nav-row{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:${C.text};font-size:12.5px;text-align:left;padding:5px 8px;border-radius:6px;cursor:pointer;font-family:inherit;min-height:28px;width:100%}
.dsh-todo-nav-row:hover{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 5%, transparent))}
.dsh-todo-nav-row[aria-current="true"]{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 8%, transparent));font-weight:600}
.dsh-todo-nav-glyph{flex:none;width:16px;text-align:center;color:${C.dim};font-size:12px}
.dsh-todo-nav-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-todo-nav-count{flex:none;font-size:10.5px;color:${C.dim};font-variant-numeric:tabular-nums}
.dsh-todo-nav-actions{flex:none;display:inline-flex;gap:2px;opacity:.45}
.dsh-todo-nav-item:hover .dsh-todo-nav-actions,.dsh-todo-nav-item:focus-within .dsh-todo-nav-actions{opacity:1}
.dsh-todo-nav-row:hover .dsh-todo-nav-actions,.dsh-todo-nav-row:focus-within .dsh-todo-nav-actions{opacity:1}
.dsh-todo-nav-item{display:flex;align-items:center}
.dsh-todo-nav-actions button{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:11px;padding:0 3px;font-family:inherit;line-height:20px;min-width:20px;min-height:20px}
.dsh-todo-nav-actions button:hover{color:${C.text}}
.dsh-todo-nav-input{width:100%;box-sizing:border-box;background:transparent;border:1px solid ${C.accent};border-radius:5px;color:${C.text};font-size:12px;padding:2px 6px;font-family:inherit;outline:none}
.dsh-todo-main{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column}
.dsh-todo-head{padding:14px 18px 0;border-bottom:1px solid ${C.border};flex:none}
.dsh-todo-title-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.dsh-todo-title{font-size:20px;font-weight:500;margin:0}
.dsh-todo-count{font-size:11.5px;color:${C.dim};font-variant-numeric:tabular-nums}
.dsh-todo-search{margin-left:auto;width:180px;box-sizing:border-box;background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.text};font-size:12px;padding:4px 8px;font-family:inherit;outline:none}
.dsh-todo-search:focus{border-color:${C.accent}}
.dsh-todo-search::placeholder{color:${C.dim}}
.dsh-todo-sort{background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.dim};font-size:11px;padding:3px 4px;font-family:inherit;outline:none;max-width:92px}
.dsh-todo-batch{background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.dim};font-size:11px;padding:3px 8px;cursor:pointer;font-family:inherit;min-height:24px}
.dsh-todo-batch[aria-pressed="true"]{border-color:${C.accent};color:${C.accent}}
.dsh-todo-new{border:1px solid ${C.accent};background:transparent;color:${C.accent};border-radius:6px;font-size:11.5px;padding:3px 9px;cursor:pointer;font-family:inherit;min-height:24px;font-weight:600}
.dsh-todo-bulk{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 18px;border-bottom:1px solid ${C.border};font-size:11.5px;color:${C.dim}}
.dsh-todo-bulk button{border:1px solid ${C.border};background:transparent;color:${C.text};border-radius:5px;font-size:11.5px;padding:3px 8px;cursor:pointer;font-family:inherit;min-height:24px}
.dsh-todo-bulk button:disabled{opacity:.5;cursor:default}
.dsh-todo-bulk button.danger{border-color:var(--dsw-alias-state-error-primary, ${C.border});color:var(--dsw-alias-state-error-primary, ${C.text})}
.dsh-todo-bulk select{border:1px solid ${C.border};background:transparent;color:${C.text};border-radius:5px;font-size:11.5px;padding:2px 4px;font-family:inherit;max-width:120px}
.dsh-todo-view-select{background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.dim};font-size:11px;padding:3px 4px;font-family:inherit;outline:none;max-width:80px}
.dsh-todo-view{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column}
.dsh-todo-board-wrap{display:flex;flex-direction:column;flex:1;min-height:0}
.dsh-todo-viewbar{display:flex;align-items:center;gap:8px;padding:8px 18px;border-bottom:1px solid ${C.border};font-size:11.5px;color:${C.dim};flex:none}
.dsh-todo-viewbar button{border:1px solid ${C.border};background:transparent;color:${C.text};border-radius:5px;font-size:11.5px;padding:2px 8px;cursor:pointer;font-family:inherit;min-height:24px}
.dsh-todo-viewbar select{border:1px solid ${C.border};background:transparent;color:${C.text};border-radius:5px;font-size:11.5px;padding:2px 4px;font-family:inherit}
.dsh-todo-viewbar strong{color:${C.text};font-weight:600}
.dsh-todo-board{display:flex;gap:10px;overflow:auto;padding:10px 18px 16px;flex:1;min-height:0}
.dsh-todo-board-col{flex:0 0 220px;display:flex;flex-direction:column;gap:6px;border:1px solid ${C.border};border-radius:8px;padding:8px;min-height:120px;background:color-mix(in srgb, ${C.text} 3%, transparent)}
.dsh-todo-board-col-head{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:600;color:${C.dim};padding:2px 4px}
.dsh-todo-board-empty{font-size:11px;color:${C.dim};padding:10px 4px;text-align:center;border:1px dashed ${C.border};border-radius:6px}
.dsh-todo-card{border:1px solid ${C.border};border-radius:6px;padding:7px 8px;background:${C.bg};cursor:pointer}
.dsh-todo-card:hover{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 5%, transparent))}
.dsh-todo-card-head{display:flex;align-items:flex-start;gap:6px}
.dsh-todo-card-title{font-size:12.5px;word-break:break-word}
.dsh-todo-card-title.done{text-decoration:line-through;color:${C.dim}}
.dsh-todo-card-check{width:14px;height:14px;margin-top:1px;font-size:10px;flex:none}
.dsh-todo-cal-wrap{display:flex;flex-direction:column;flex:1;min-height:0}
.dsh-todo-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;padding:0 18px 16px;flex:1;overflow:auto}
.dsh-todo-cal-week{font-size:10.5px;color:${C.dim};text-align:center;padding:3px 0}
.dsh-todo-cal-day{min-height:84px;border:1px solid ${C.border};border-radius:5px;padding:3px 4px;display:flex;flex-direction:column;gap:2px;overflow:hidden}
.dsh-todo-cal-day.blank{border-color:transparent;background:transparent}
.dsh-todo-cal-date{font-size:10.5px;color:${C.dim};text-align:right}
.dsh-todo-cal-task{font-size:10.5px;padding:1px 4px;border-radius:3px;background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 5%, transparent));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.dsh-todo-cal-more{font-size:10px;color:${C.dim}}
.dsh-todo-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;padding:0 18px 16px;flex:1;overflow:auto;align-content:start}
.dsh-todo-week-head{font-size:10.5px;color:${C.dim};display:flex;justify-content:space-between;padding:2px 4px;border-bottom:1px solid ${C.border}}
.dsh-todo-week-col{border:1px solid ${C.border};border-radius:6px;min-height:180px;padding:4px;display:flex;flex-direction:column;gap:3px;overflow:hidden}
.dsh-todo-week-time{color:${C.dim};margin-right:4px;font-variant-numeric:tabular-nums}
.dsh-todo-day{display:flex;flex-direction:column;padding:0 18px 16px;flex:1;overflow:auto}
.dsh-todo-day-all{border:1px solid ${C.border};border-radius:6px;padding:6px;margin:8px 0;display:flex;flex-direction:column;gap:3px;min-height:36px}
.dsh-todo-hour-row{display:flex;gap:8px;border-top:1px solid ${C.border};min-height:36px;padding:3px 0}
.dsh-todo-hour-label{flex:0 0 44px;font-size:10.5px;color:${C.dim};text-align:right;padding-top:2px}
.dsh-todo-hour-tasks{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.dsh-todo-matrix{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px 18px 16px;flex:1;min-height:0;overflow:auto}
.dsh-todo-matrix-cell{border:1px solid ${C.border};border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:140px}
.dsh-todo-stats{padding:12px 18px 18px;display:flex;flex-direction:column;gap:14px;flex:1;overflow:auto}
.dsh-todo-stat-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.dsh-todo-stat-card{border:1px solid ${C.border};border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:2px}
.dsh-todo-stat-card strong{font-size:18px}
.dsh-todo-stat-card span{font-size:10.5px;color:${C.dim}}
.dsh-todo-stat-section{display:flex;flex-direction:column;gap:6px}
.dsh-todo-chart{display:flex;align-items:flex-end;gap:2px;height:80px;border-bottom:1px solid ${C.border};padding:0 2px}
.dsh-todo-bar{flex:1;background:${C.accent};min-height:1px;border-radius:2px 2px 0 0;opacity:.75}
.dsh-todo-stat-row{display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0}
.dsh-todo-stat-empty{font-size:11.5px;color:${C.dim}}
@media (max-width:720px){.dsh-todo-matrix{grid-template-columns:1fr}.dsh-todo-stat-cards{grid-template-columns:repeat(2,1fr)}}
.dsh-todo-add{padding:10px 18px 8px;flex:none}
.dsh-todo-input{width:100%;box-sizing:border-box;background:transparent;border:1px solid ${C.border};border-radius:8px;color:${C.text};font-size:13px;padding:8px 10px;outline:none;font-family:inherit}
.dsh-todo-input:focus{border-color:${C.accent}}
.dsh-todo-input::placeholder{color:${C.dim}}
.dsh-todo-preview{display:flex;flex-wrap:wrap;gap:6px;padding:6px 2px 0;font-size:11px;color:${C.dim};min-height:18px}
.dsh-todo-chip{border:1px solid ${C.border};border-radius:999px;padding:0 7px;line-height:17px}
.dsh-todo-chip.strong{color:${C.text};font-weight:600}
.dsh-todo-hint{color:${C.text};font-weight:500}
.dsh-todo-error{margin:0 18px 8px;padding:6px 9px;border:1px solid ${C.border};border-radius:6px;font-size:11.5px;color:${C.text}}
.dsh-todo-list{flex:1 1 auto;min-height:0;overflow:auto;padding:2px 10px 16px}
.dsh-todo-row{display:flex;align-items:flex-start;gap:9px;padding:8px;border-radius:8px}
.dsh-todo-row:hover{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 5%, transparent))}
.dsh-todo-row.active{background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 7%, transparent))}
.dsh-todo-row.selected{background:color-mix(in srgb, ${C.accent} 10%, transparent)}
.dsh-todo-row.dragging{opacity:.5}
.dsh-todo-row.drop-target{box-shadow:inset 0 2px 0 ${C.accent}}
.dsh-todo-folder-row{font-weight:600}
.dsh-todo-nav-sub .dsh-todo-nav-row{padding-left:24px}
.dsh-todo-list-editor{display:flex;flex-direction:column;gap:3px;padding:2px 0}
.dsh-todo-nav-save{border:1px solid ${C.border};background:transparent;color:${C.accent};border-radius:5px;font-size:11px;padding:2px 6px;cursor:pointer;font-family:inherit}
.dsh-todo-check{flex:none;width:16px;height:16px;margin-top:2px;border:1.5px solid ${C.dim};border-radius:4px;background:transparent;color:${C.accent};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:11px;line-height:1;padding:0;font-family:inherit}
.dsh-todo-check[aria-checked="true"]{border-color:${C.accent};color:${C.accent}}
.dsh-todo-body{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px}
.dsh-todo-text{word-break:break-word}
.dsh-todo-text.done{text-decoration:line-through;color:${C.dim}}
.dsh-todo-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px;font-size:11px;color:${C.dim}}
.dsh-todo-due.overdue{color:var(--dsw-alias-state-error-primary, ${C.text});font-weight:600}
.dsh-todo-pri{font-weight:600;color:${C.text}}
.dsh-todo-subtoggle{border:0;background:transparent;color:${C.dim};font-size:11px;padding:0 3px;cursor:pointer;font-family:inherit;border-radius:3px}
.dsh-todo-subtoggle:hover{color:${C.text};background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 6%, transparent))}
.dsh-todo-inline-subs{display:flex;flex-direction:column;gap:2px;margin:4px 0 2px 25px}
.dsh-todo-inline-sub{display:flex;align-items:center;gap:6px;font-size:11.5px;color:${C.dim}}
.dsh-todo-inline-sub .dsh-todo-check{width:13px;height:13px;margin-top:0;font-size:9px;flex:none}
.dsh-todo-inline-sub.done .dsh-todo-inline-sub-title{text-decoration:line-through;opacity:.65}
.dsh-todo-inline-sub-title{flex:1 1 auto;min-width:0;word-break:break-word}
.dsh-todo-inline-sub-del{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:10px;padding:0 2px;font-family:inherit;min-width:18px;min-height:18px}
.dsh-todo-inline-sub-del:hover{color:${C.text}}
.dsh-todo-inline-sub-add{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:10.5px;padding:1px 3px;font-family:inherit;text-align:left}
.dsh-todo-inline-sub-add:hover{color:${C.accent}}
.dsh-todo-inline-sub-input{width:100%;box-sizing:border-box;background:transparent;border:1px solid ${C.accent};border-radius:4px;color:${C.text};font-size:11.5px;padding:2px 5px;font-family:inherit;outline:none}
.dsh-todo-addsub{flex:none;width:22px;height:22px;margin-top:-2px;border:0;border-radius:5px;background:transparent;color:${C.dim};cursor:pointer;font-size:13px;padding:0;line-height:22px;font-family:inherit;opacity:.55}
.dsh-todo-row:hover .dsh-todo-addsub,.dsh-todo-addsub:focus-visible{opacity:1}
.dsh-todo-addsub:hover{color:${C.text};background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 6%, transparent))}
.dsh-todo-card-subs{margin-top:3px;display:flex;flex-direction:column;gap:1px;font-size:10.5px;color:${C.dim}}
.dsh-todo-card-sub{display:flex;align-items:center;gap:4px;min-width:0}
.dsh-todo-card-sub.done .dsh-todo-card-subtext{text-decoration:line-through;opacity:.7}
.dsh-todo-card-subcheck{width:12px;height:12px;margin-top:0;font-size:8px;flex:none}
.dsh-todo-card-subtext{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-todo-card-subdel{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:9px;padding:0 2px;font-family:inherit;min-width:16px;min-height:16px}
.dsh-todo-card-subdel:hover{color:${C.text}}
.dsh-todo-card-subadd{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:10px;padding:0;font-family:inherit;text-align:left}
.dsh-todo-card-subadd:hover{color:${C.accent}}
.dsh-todo-card-subinput{width:100%;box-sizing:border-box;background:transparent;border:1px solid ${C.accent};border-radius:3px;color:${C.text};font-size:10.5px;padding:1px 4px;font-family:inherit;outline:none}
.dsh-todo-del{flex:none;width:24px;height:24px;margin-top:-2px;border:0;border-radius:5px;background:transparent;color:${C.dim};cursor:pointer;font-size:12px;padding:0;line-height:24px;font-family:inherit;opacity:.55}
.dsh-todo-row:hover .dsh-todo-del,.dsh-todo-del:focus-visible{opacity:1}
.dsh-todo-del:hover{color:${C.text};background:var(--dsw-alias-interactive-bg-hover, color-mix(in srgb, ${C.text} 6%, transparent))}
.dsh-todo-empty{padding:36px 18px;text-align:center;color:${C.dim};font-size:12.5px}
.dsh-todo-empty strong{display:block;color:${C.text};font-size:13px;font-weight:600;margin-bottom:6px}
.dsh-todo-empty button{margin-top:10px;border:1px solid ${C.border};background:transparent;color:${C.accent};border-radius:6px;font-size:11.5px;padding:4px 10px;cursor:pointer;font-family:inherit}
.dsh-todo-undo{display:flex;align-items:center;gap:10px;margin:0 12px 6px;padding:6px 10px;border:1px solid ${C.border};border-radius:6px;font-size:11.5px;color:${C.dim}}
.dsh-todo-undo span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-todo-undo button{margin-left:auto;border:0;background:transparent;color:${C.accent};font-size:11.5px;cursor:pointer;padding:0;font-family:inherit;font-weight:600}
.dsh-todo-foot{flex:none;padding:8px 18px;border-top:1px solid ${C.border};font-size:11px;color:${C.dim};display:flex;gap:8px;align-items:center}
.dsh-todo-foot button{margin-left:auto;border:0;background:transparent;color:${C.dim};font-size:11px;cursor:pointer;padding:0;font-family:inherit;min-height:24px}
.dsh-todo-foot button:hover{color:${C.text}}
.dsh-todo-detail{flex:0 0 320px;min-width:0;border-left:1px solid ${C.border};display:flex;flex-direction:column;min-height:0;background:${C.bg}}
.dsh-todo-detail-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid ${C.border};flex:none}
.dsh-todo-detail-head strong{font-size:13px;font-weight:600}
.dsh-todo-detail-head button{margin-left:0;border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:14px;font-family:inherit;padding:0 4px}
.dsh-todo-detail-hint{margin-left:auto;font-size:10.5px;color:${C.dim}}
.dsh-todo-detail-head button:hover{color:${C.text}}
.dsh-todo-detail-body{flex:1 1 auto;min-height:0;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.dsh-todo-field{display:flex;flex-direction:column;gap:4px}
.dsh-todo-field label{font-size:11px;color:${C.dim}}
.dsh-todo-field input,.dsh-todo-field textarea,.dsh-todo-field select{width:100%;box-sizing:border-box;background:transparent;border:1px solid ${C.border};border-radius:6px;color:${C.text};font-size:12.5px;padding:6px 8px;font-family:inherit;outline:none}
.dsh-todo-field input:focus,.dsh-todo-field textarea:focus,.dsh-todo-field select:focus{border-color:${C.accent}}
.dsh-todo-field textarea{min-height:96px;resize:vertical;line-height:1.5}
.dsh-todo-field .dsh-todo-inline{display:flex;gap:6px;align-items:center}
.dsh-todo-field .dsh-todo-inline input{flex:1 1 auto}
.dsh-todo-field .dsh-todo-inline button{flex:none;border:1px solid ${C.border};background:transparent;color:${C.dim};border-radius:5px;font-size:11px;padding:3px 7px;cursor:pointer;font-family:inherit}
.dsh-todo-detail-foot{flex:none;padding:10px 14px;border-top:1px solid ${C.border};display:flex;gap:8px;align-items:center}
.dsh-todo-detail-foot .primary{border:1px solid ${C.accent};background:transparent;color:${C.accent};border-radius:6px;font-size:12.5px;padding:5px 12px;cursor:pointer;font-family:inherit;font-weight:600}
.dsh-todo-detail-foot .danger{margin-left:auto;border:0;background:transparent;color:${C.dim};font-size:11.5px;cursor:pointer;font-family:inherit}
.dsh-todo-detail-foot .danger:hover{color:${C.text}}
.dsh-todo-sublist{display:flex;flex-direction:column;gap:2px}
.dsh-todo-subrow{display:flex;align-items:center;gap:6px;font-size:12px;min-height:24px}
.dsh-todo-subcheck{width:14px;height:14px;margin-top:0;font-size:10px}
.dsh-todo-subtext{flex:1 1 auto;min-width:0;word-break:break-word}
.dsh-todo-subtext.done{text-decoration:line-through;color:${C.dim}}
.dsh-todo-sublist-del{border:0;background:transparent;color:${C.dim};cursor:pointer;font-size:11px;padding:0 3px;font-family:inherit;min-width:20px;min-height:20px}
.dsh-todo-sublist-del:hover{color:${C.text}}
.dsh-todo-subaction{border:1px solid ${C.border};background:transparent;color:${C.dim};border-radius:5px;font-size:10.5px;padding:1px 6px;cursor:pointer;font-family:inherit;min-height:22px}
.dsh-todo-subaction:hover{color:${C.text}}
.dsh-todo-reminder-time{flex:1 1 auto;font-size:12px}
.dsh-todo-reminder-state{font-size:10.5px;color:${C.dim}}
.dsh-todo-days{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
.dsh-todo-day{border:1px solid ${C.border};background:transparent;color:${C.dim};border-radius:999px;width:24px;height:24px;font-size:11px;cursor:pointer;font-family:inherit;padding:0}
.dsh-todo-day[aria-pressed="true"]{border-color:${C.accent};color:${C.accent};font-weight:600}
.dsh-todo-repeat-summary{font-size:11px;color:${C.dim};margin-top:2px}
@media (max-width:900px){
  .dsh-todo-detail{position:absolute;top:0;right:0;bottom:0;width:min(340px,100%);box-shadow:-8px 0 24px rgba(0,0,0,.18);z-index:2}
}
@media (max-width:720px){
  .dsh-todo-rail{display:none}
  .dsh-todo-search{width:120px}
}
@media (prefers-reduced-motion:no-preference){.dsh-todo-nav-row,.dsh-todo-check,.dsh-todo-del{transition:color .12s,border-color .12s,opacity .12s,background .12s}}
/* Native select popups otherwise inherit the closed control's transparent
   background and can render dark-on-dark in the dark theme. */
.dsh-todo-page select{background-color:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);color-scheme:light dark}
.dsh-todo-page select option,.dsh-todo-page select optgroup{background-color:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
`

      // >>> todo-date-helpers (kept contiguous so the workspace test can evaluate this slice)
      /** Local midnight at or before `ms`. */
      function startOfDay(ms) {
        const date = new Date(ms)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      }

      /** Local end of the day containing `ms`. */
      function endOfDay(ms) {
        const date = new Date(ms)
        date.setHours(23, 59, 59, 999)
        return date.getTime()
      }

      /** Calendar-day difference from `base` to `value`. */
      function dayDiff(value, base) {
        return Math.round((startOfDay(value) - startOfDay(base)) / DAY)
      }

      /**
       * Parse the quick-add line: `交周报 明天 18:00 !1 #工作 ^工作`.
       * `!1`/`!2`/`!3` mean high/medium/low; the store keeps 3/2/1.
       * @param raw - draft text.
       * @param now - current epoch milliseconds.
       */
      function parseQuickAdd(raw, now) {
        let rest = ` ${String(raw || '')} `
        let priority = 0
        let tag = null
        let listName = null
        let dateTarget = null
        let time = null

        rest = rest.replace(/(?:^|\s)!([1-3])(?=\s|$)/g, (_match, value) => {
          priority = 4 - Number(value)
          return ' '
        })
        rest = rest.replace(/(?:^|\s)#([^\s#]+)/g, (_match, value) => {
          tag = value
          return ' '
        })
        rest = rest.replace(/(?:^|\s)\^([^\s^]+)/g, (_match, value) => {
          listName = value
          return ' '
        })

        // Explicit YYYY-MM-DD (before the short form so the year is not eaten).
        rest = rest.replace(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, (_match, year, month, day) => {
          dateTarget = { year: Number(year), month: Number(month) - 1, day: Number(day) }
          return ' '
        })
        if (dateTarget === null) {
          rest = rest.replace(/(\d{1,2})[月/-](\d{1,2})日?/, (_match, month, day) => {
            const monthIndex = Number(month) - 1
            const dayNumber = Number(day)
            if (monthIndex < 0 || monthIndex > 11 || dayNumber < 1 || dayNumber > 31) return _match
            const year = new Date(now).getFullYear()
            const candidate = new Date(year, monthIndex, dayNumber)
            dateTarget = { year: candidate.getTime() < startOfDay(now) ? year + 1 : year, month: monthIndex, day: dayNumber }
            return ' '
          })
        }

        // Named days; order matters (大后天 before 后天).
        if (dateTarget === null) {
          rest = rest.replace(/(大后天|后天|明天|明早|今晚|今天)/, (match) => {
            if (match === '今天') dateTarget = { offset: 0 }
            else if (match === '明天') dateTarget = { offset: 1 }
            else if (match === '后天') dateTarget = { offset: 2 }
            else if (match === '大后天') dateTarget = { offset: 3 }
            else if (match === '今晚') {
              dateTarget = { offset: 0 }
              time = { hour: 20, minute: 0 }
            } else {
              dateTarget = { offset: 1 }
              time = { hour: 9, minute: 0 }
            }
            return ' '
          })
        }

        // Weekday, optionally prefixed by 下.
        if (dateTarget === null) {
          rest = rest.replace(/(?:(下周|下星期|下礼拜)|(?:周|星期|礼拜))([一二三四五六日天])/, (_match, nextWeek, weekday) => {
            const table = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }
            const target = table[weekday]
            if (target === undefined) return _match
            const base = startOfDay(now)
            let offset
            if (nextWeek !== undefined) {
              const dow = new Date(base).getDay()
              const untilMonday = (8 - dow) % 7 || 7
              offset = untilMonday + (target === 0 ? 6 : target - 1)
            } else {
              offset = (target - new Date(base).getDay() + 7) % 7
            }
            dateTarget = { offset }
            return ' '
          })
        }

        // Time: 18:00, 18点, 18点半, 下午 3:30.
        rest = rest.replace(/(上午|早上|清晨|中午|下午|傍晚|晚上|夜里)?\s*(\d{1,2})(?:[:：](\d{1,2})|点(半|\d{1,2})?)/, (_match, period, hourText, minuteText, pointMinute) => {
          let hour = Number(hourText)
          let minute = minuteText !== undefined ? Number(minuteText) : pointMinute === '半' ? 30 : pointMinute !== undefined ? Number(pointMinute) : 0
          if (minute === undefined || Number.isNaN(minute)) minute = 0
          if (hour > 23 || minute > 59) return _match
          if (period === '下午' || period === '傍晚' || period === '晚上' || period === '夜里') {
            if (hour < 12) hour += 12
          } else if (period === '中午') {
            if (hour < 11) hour += 12
          } else if (period === '上午' || period === '早上' || period === '清晨') {
            if (hour === 12) hour = 0
          }
          time = { hour, minute }
          return ' '
        })

        const text = rest.replace(/\s+/g, ' ').replace(/^[\s,，;；、\-–—]+|[\s,，;；、\-–—]+$/g, '').trim()

        let dueAt = null
        if (dateTarget !== null) {
          let date
          if (dateTarget.offset !== undefined) {
            date = new Date(startOfDay(now))
            date.setDate(date.getDate() + dateTarget.offset)
          } else {
            date = new Date(dateTarget.year, dateTarget.month, dateTarget.day)
          }
          if (time !== null) {
            date.setHours(time.hour, time.minute, 0, 0)
            dueAt = date.getTime()
          } else {
            date.setHours(23, 59, 59, 999)
            dueAt = date.getTime()
          }
        } else if (time !== null) {
          const date = new Date(now)
          date.setHours(time.hour, time.minute, 0, 0)
          if (date.getTime() <= now) date.setDate(date.getDate() + 1)
          dueAt = date.getTime()
        }

        return { text, dueAt, priority, tag, listName }
      }

      /** One-line due label. */
      function formatDue(dueAt, now) {
        const date = new Date(dueAt)
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        const dateOnly = date.getHours() === 23 && date.getMinutes() === 59
        const suffix = dateOnly ? '' : ` ${hour}:${minute}`
        if (dueAt < now) return `已逾期 · ${date.getMonth() + 1}月${date.getDate()}日${suffix}`
        const diff = dayDiff(dueAt, now)
        if (diff === 0) return `今天${suffix}`
        if (diff === 1) return `明天${suffix}`
        if (diff > 1 && diff < 7) return `${WEEK[date.getDay()]}${suffix}`
        return `${date.getMonth() + 1}月${date.getDate()}日${suffix}`
      }
      // <<< todo-date-helpers

      /** Render a due time as quick-add tokens for the detail editor. */
      function dueEditToken(dueAt) {
        const date = new Date(dueAt)
        const dateOnly = date.getHours() === 23 && date.getMinutes() === 59
        const stamp = `${date.getMonth() + 1}月${date.getDate()}日`
        if (dateOnly) return stamp
        return `${stamp} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      /** Local `datetime-local` value for an epoch time. */
      function toLocalInput(ms) {
        if (ms === null) return ''
        const date = new Date(ms)
        const pad = value => String(value).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
      }

      /** Short local label for a reminder time. */
      function formatReminder(ms) {
        const date = new Date(ms)
        const pad = value => String(value).padStart(2, '0')
        return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
      }

      /** Priority label (store: 3 high, 2 medium, 1 low). */
      function priorityLabel(priority) {
        return priority === 3 ? '高' : priority === 2 ? '中' : priority === 1 ? '低' : ''
      }

      /** Sort rank: high before medium before low, none last. */
      function priorityRank(priority) {
        return priority >= 1 && priority <= 3 ? 4 - priority : 4
      }

      function readNotified() {
        try {
          const parsed = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || '[]')
          return new Set(Array.isArray(parsed) ? parsed : [])
        } catch {
          return new Set()
        }
      }

      function writeNotified(set) {
        try {
          window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set].slice(-300)))
        } catch {
          /* storage unavailable */
        }
      }

      function requestNotifyPermission() {
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {})
          }
        } catch {
          /* unsupported */
        }
      }

      /** Host call: no payload reads the store, payload applies one operation. */
      async function callHost(payload) {
        const controller = new AbortController()
        const timer = window.setTimeout(() => controller.abort(), 5000)
        try {
          const options = payload === undefined ? {} : {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          }
          const response = await fetch(ROUTE_STATE, { ...options, signal: controller.signal })
          const data = await response.json()
          if (!data || data.ok !== true) throw new Error((data && data.error) || '宿主请求失败')
          return data
        } finally {
          window.clearTimeout(timer)
        }
      }

      /**
       * Fire batched notifications for due tasks, independent of the page.
       * The panel unmounts when a session fills the main column, so the scan
       * cannot live in a component effect.
       */
      async function scanDue() {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
        let data
        try {
          data = await callHost()
        } catch {
          return
        }
        const current = Date.now()
        const dueByTask = []
        for (const task of data.state.tasks || []) {
          if (task.deletedAt || task.status !== 'open') continue
          const due = (task.reminders || []).filter(reminder => reminder.at <= current && reminder.firedAt === null)
          if (due.length > 0) dueByTask.push({ task, reminders: due })
        }
        if (dueByTask.length === 0) return
        const body = dueByTask.length === 1
          ? dueByTask[0].task.title
          : dueByTask.slice(0, 3).map(entry => `· ${entry.task.title}`).join('\n') + (dueByTask.length > 3 ? `\n…还有 ${dueByTask.length - 3} 条` : '')
        let shown = false
        try {
          new Notification(dueByTask.length === 1 ? '待办到期' : `${dueByTask.length} 条待办到期`, { body, tag: 'dsh-sidebar-todo' })
          shown = true
        } catch {
          /* notification failed */
        }
        if (!shown) return
        // Mark only after a successful notification, so a failed attempt is
        // retried on the next scan.
        for (const entry of dueByTask) {
          try {
            await callHost({ op: 'reminder.fire', id: entry.task.id, reminderIds: entry.reminders.map(reminder => reminder.id) })
          } catch {
            /* retried on the next scan */
          }
        }
      }

      function TodoIcon({ size = 16, active = false }) {
        const color = active ? C.accent : 'currentColor'
        return h('svg', {
          width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
          'aria-hidden': 'true', style: { display: 'block' },
        },
        h('rect', { x: 2.25, y: 2.25, width: 11.5, height: 11.5, rx: 2.4, stroke: color, strokeWidth: 1.3 }),
        h('path', { d: 'M4.9 6.15l1.05 1.05 1.95-2.05', stroke: color, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M4.9 10.15l1.05 1.05 1.95-2.05', stroke: color, strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M9.6 6.3h2.4M9.6 10.3h2.4', stroke: color, strokeWidth: 1.3, strokeLinecap: 'round' }))
      }

      const EMPTY_STATE = { version: 3, revision: 0, folders: [], lists: [{ id: 'inbox', name: '收件箱', order: 0, folderId: null }], tags: [], tasks: [], settings: { defaultListId: 'inbox', sort: 'smart' } }

      function TodoPage() {
        const [state, setState] = React.useState(EMPTY_STATE)
        const [stats, setStats] = React.useState({ open: 0, done: 0, overdue: 0 })
        const [selection, setSelection] = React.useState({ kind: 'view', id: 'today' })
        const [search, setSearch] = React.useState('')
        const [draft, setDraft] = React.useState('')
        const [detailId, setDetailId] = React.useState(null)
        const [detailDraft, setDetailDraft] = React.useState(null)
        const [creating, setCreating] = React.useState(false)
        const [createDraft, setCreateDraft] = React.useState(null)
        const [createError, setCreateError] = React.useState('')
        const [subtaskDraft, setSubtaskDraft] = React.useState('')
        const [reminderAt, setReminderAt] = React.useState('')
        const [addingList, setAddingList] = React.useState(false)
        const [listName, setListName] = React.useState('')
        const [editingListId, setEditingListId] = React.useState(null)
        const [renameValue, setRenameValue] = React.useState('')
        const [editFolderId, setEditFolderId] = React.useState('')
        const [confirmListDelete, setConfirmListDelete] = React.useState(null)
        const [addingFolder, setAddingFolder] = React.useState(false)
        const [folderName, setFolderName] = React.useState('')
        const [renamingFolderId, setRenamingFolderId] = React.useState(null)
        const [renameFolderValue, setRenameFolderValue] = React.useState('')
        const [confirmFolderDelete, setConfirmFolderDelete] = React.useState(null)
        const [collapsedFolders, setCollapsedFolders] = React.useState([])
        const [selectMode, setSelectMode] = React.useState(false)
        const [selectedIds, setSelectedIds] = React.useState([])
        const [collapsedSubs, setCollapsedSubs] = React.useState([])
        const [addSubFor, setAddSubFor] = React.useState(null)
        const [subDraft, setSubDraft] = React.useState('')
        const [bulkListId, setBulkListId] = React.useState('')
        const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false)
        const [dragId, setDragId] = React.useState(null)
        const [dropId, setDropId] = React.useState(null)
        const [activeIndex, setActiveIndex] = React.useState(-1)
        const [mode, setMode] = React.useState(() => {
          try {
            const stored = window.localStorage.getItem('dsh-sidebar-todo:view')
            return MODES.includes(stored) ? stored : 'list'
          } catch {
            return 'list'
          }
        })
        const [boardBy, setBoardBy] = React.useState('priority')
        const [calendarMonth, setCalendarMonth] = React.useState(() => Date.now())
        const [calendarMode, setCalendarMode] = React.useState(() => {
          try {
            const stored = window.localStorage.getItem('dsh-sidebar-todo:calendar')
            return ['month', 'week', 'day'].includes(stored) ? stored : 'month'
          } catch {
            return 'month'
          }
        })
        const [boardDragId, setBoardDragId] = React.useState(null)
        const [renamingTag, setRenamingTag] = React.useState(null)
        const [renameTagValue, setRenameTagValue] = React.useState('')
        const [confirmTagDelete, setConfirmTagDelete] = React.useState(null)
        const [loadError, setLoadError] = React.useState('')
        const [saveError, setSaveError] = React.useState('')
        const [detailError, setDetailError] = React.useState('')
        const [confirmClose, setConfirmClose] = React.useState(false)
        const [loaded, setLoaded] = React.useState(false)
        const [hint, setHint] = React.useState('')
        const [undo, setUndo] = React.useState(null)
        const [now, setNow] = React.useState(() => Date.now())
        const [notifyPermission, setNotifyPermission] = React.useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
        const [busy, setBusy] = React.useState(false)
        const pendingRef = React.useRef(false)
        const draftRef = React.useRef(null)
        const revisionRef = React.useRef(-1)
        const pollInFlightRef = React.useRef(false)
        const queueRef = React.useRef(Promise.resolve())
        const undoTimerRef = React.useRef(0)
        const listTimerRef = React.useRef(0)
        const tagTimerRef = React.useRef(0)
        const folderTimerRef = React.useRef(0)
        const initialReminderIdsRef = React.useRef(new Set())
        const searchRef = React.useRef(null)

        const refresh = React.useCallback(async () => {
          if (pollInFlightRef.current) return
          pollInFlightRef.current = true
          try {
            const data = await callHost()
            if (data.state.revision > revisionRef.current) {
              revisionRef.current = data.state.revision
              setState(data.state)
              setStats(data.stats)
            }
            setLoaded(true)
            setLoadError('')
          } catch (cause) {
            setLoadError(`无法连接宿主：${cause && cause.message ? cause.message : '请求失败'}`)
          } finally {
            pollInFlightRef.current = false
          }
        }, [])

        const mutate = React.useCallback((payload) => {
          const run = queueRef.current.then(async () => {
            try {
              const data = await callHost(payload)
              if (data.state.revision > revisionRef.current) {
                revisionRef.current = data.state.revision
                setState(data.state)
              }
              setStats(data.stats)
              setLoaded(true)
              setSaveError('')
              return data
            } catch (cause) {
              setSaveError(`保存失败：${cause && cause.message ? cause.message : '请求失败'}`)
              return null
            }
          })
          queueRef.current = run.then(() => {}, () => {})
          return run
        }, [])

        React.useEffect(() => {
          void refresh()
          const timer = window.setInterval(() => { void refresh() }, 3000)
          const tick = window.setInterval(() => setNow(Date.now()), 30000)
          const onVisible = () => { if (!document.hidden) void refresh() }
          document.addEventListener('visibilitychange', onVisible)
          return () => {
            window.clearInterval(timer)
            window.clearInterval(tick)
            document.removeEventListener('visibilitychange', onVisible)
          }
        }, [refresh])

        React.useEffect(() => () => {
          if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
          if (listTimerRef.current) window.clearTimeout(listTimerRef.current)
          if (tagTimerRef.current) window.clearTimeout(tagTimerRef.current)
          if (folderTimerRef.current) window.clearTimeout(folderTimerRef.current)
        }, [])

        const parsed = React.useMemo(() => (draft.trim() === '' ? null : parseQuickAdd(draft, now)), [draft, now])
        const liveTasks = state.tasks.filter(task => !task.deletedAt)
        const endToday = endOfDay(now)
        const lists = state.lists.filter(list => !list.deletedAt)
        const folders = [...(state.folders || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
        const ungroupedLists = lists.filter(list => !list.folderId)
        const listsInFolder = folderId => lists.filter(list => list.folderId === folderId)
        const sortMode = state.settings?.sort || 'smart'
        const tagList = (state.tags || []).filter(tag => liveTasks.some(task => task.tags.includes(tag)))
        const listById = id => lists.find(list => list.id === id)
        const taskById = id => state.tasks.find(task => task.id === id)

        const matchesSelection = task => {
          if (selection.kind === 'view') {
            if (selection.id === 'completed') return task.status === 'completed'
            if (task.status === 'completed') return false
            if (selection.id === 'today') return task.dueAt !== null && task.dueAt <= endToday
            if (selection.id === 'upcoming') return task.dueAt !== null && task.dueAt > endToday && task.dueAt <= endOfDay(now + 6 * DAY)
            return true
          }
          if (task.status === 'completed') return false
          if (selection.kind === 'list') return task.listId === selection.id
          return task.tags.includes(selection.name)
        }

        const rows = liveTasks.filter(task => {
          if (!matchesSelection(task)) return false
          if (search.trim() === '') return true
          const haystack = `${task.title}\n${task.notes}\n${task.tags.join(' ')}\n${task.subtasks.map(item => item.title).join(' ')}`.toLowerCase()
          return haystack.includes(search.trim().toLowerCase())
        }).sort((a, b) => {
          if (selection.kind === 'view' && selection.id === 'completed') return (b.completedAt || 0) - (a.completedAt || 0)
          if (sortMode === 'manual') return (a.order || 0) - (b.order || 0)
          if (sortMode === 'due') return ((a.dueAt || Infinity) - (b.dueAt || Infinity)) || (priorityRank(b.priority) - priorityRank(a.priority))
          return (priorityRank(b.priority) - priorityRank(a.priority))
            || ((a.dueAt || Infinity) - (b.dueAt || Infinity))
            || (b.createdAt - a.createdAt)
        })

        React.useEffect(() => {
          setActiveIndex(current => (current >= rows.length ? rows.length - 1 : current))
        }, [rows.length])

        React.useEffect(() => {
          try { window.localStorage.setItem('dsh-sidebar-todo:view', mode) } catch { /* ignore */ }
          if (mode !== 'list') {
            setSelectMode(false)
            setSelectedIds([])
          }
        }, [mode])

        React.useEffect(() => {
          try { window.localStorage.setItem('dsh-sidebar-todo:calendar', calendarMode) } catch { /* ignore */ }
        }, [calendarMode])

        React.useEffect(() => {
          setSelectedIds([])
          setActiveIndex(-1)
          setConfirmBulkDelete(false)
        }, [selection, search, sortMode])

        const countFor = item => {
          if (item.kind === 'view') {
            if (item.id === 'completed') return liveTasks.filter(task => task.status === 'completed').length
            return liveTasks.filter(task => task.status === 'open' && (item.id === 'today'
              ? task.dueAt !== null && task.dueAt <= endToday
              : item.id === 'upcoming' ? task.dueAt !== null && task.dueAt > endToday : true)).length
          }
          if (item.kind === 'list') return liveTasks.filter(task => task.status === 'open' && task.listId === item.id).length
          return liveTasks.filter(task => task.status === 'open' && task.tags.includes(item.name)).length
        }

        const title = selection.kind === 'view'
          ? { today: '今天', upcoming: '最近 7 天', all: '全部', completed: '已完成' }[selection.id]
          : selection.kind === 'list' ? (listById(selection.id)?.name || '清单') : `#${selection.name}`

        const openDetail = task => {
          setCreating(false)
          setCreateDraft(null)
          setDetailId(task.id)
          setDetailError('')
          setSubtaskDraft('')
          setReminderAt(toLocalInput(task.dueAt) || toLocalInput(Date.now() + 3600000))
          initialReminderIdsRef.current = new Set(task.reminders.map(reminder => reminder.id))
          setDetailDraft({
            title: task.title,
            notes: task.notes,
            listId: task.listId,
            priority: String(task.priority),
            dueLocal: toLocalInput(task.dueAt),
            tags: task.tags.join(', '),
            repeat: task.recurrence === null ? '' : task.recurrence.kind,
            weekdays: task.recurrence !== null && Array.isArray(task.recurrence.weekdays) ? task.recurrence.weekdays : [],
          })
        }

        const closeDetail = () => {
          setDetailId(null)
          setDetailDraft(null)
          setDetailError('')
          setConfirmClose(false)
        }

        const openCreate = () => {
          closeDetail()
          const listId = selection.kind === 'list' ? selection.id : (state.settings?.defaultListId || 'inbox')
          setCreateDraft({
            title: '',
            notes: '',
            listId,
            priority: '0',
            dueLocal: '',
            tags: '',
            subtasks: '',
            repeat: '',
            weekdays: [],
          })
          setCreateError('')
          setCreating(true)
        }

        const closeCreate = () => {
          setCreating(false)
          setCreateDraft(null)
          setCreateError('')
        }

        React.useEffect(() => { setConfirmClose(false) }, [detailDraft])

        const detailDirty = () => {
          if (detailDraft === null || detailId === null) return false
          const task = taskById(detailId)
          if (task === undefined) return false
          const sameDays = JSON.stringify([...detailDraft.weekdays].sort((a, b) => a - b))
            === JSON.stringify([...(task.recurrence?.weekdays || [])].sort((a, b) => a - b))
          return detailDraft.title !== task.title
            || detailDraft.notes !== task.notes
            || detailDraft.listId !== task.listId
            || detailDraft.priority !== String(task.priority)
            || detailDraft.dueLocal !== toLocalInput(task.dueAt)
            || detailDraft.tags !== task.tags.join(', ')
            || detailDraft.repeat !== (task.recurrence?.kind || '')
            || !sameDays
        }

        const requestClose = () => {
          if (detailDirty() && !confirmClose) {
            setConfirmClose(true)
            return
          }
          closeDetail()
        }

        // Keep the drawer honest when a poll changes or removes the open task.
        React.useEffect(() => {
          if (detailId === null) return
          const task = taskById(detailId)
          if (task === undefined || task.deletedAt) closeDetail()
        })

        const enableNotifications = () => {
          requestNotifyPermission()
          window.setTimeout(() => {
            setNotifyPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
          }, 500)
        }

        const runBusy = async fn => {
          if (pendingRef.current) return null
          pendingRef.current = true
          setBusy(true)
          try {
            return await fn()
          } finally {
            pendingRef.current = false
            setBusy(false)
          }
        }

        const submit = () => runBusy(async () => {
          const raw = draft.trim()
          if (raw === '') return
          const result = parseQuickAdd(raw, Date.now())
          if (result.text.trim() === '') {
            setHint('只写了日期或标签，补一句要做什么')
            return
          }
          setHint('')
          const explicitList = result.listName === null ? null : lists.find(list => list.name === result.listName || list.id === result.listName)
          if (result.listName !== null && explicitList === undefined) {
            setHint(`清单「${result.listName}」不存在，先新建或改用 #标签`)
            return
          }
          const listId = result.listName !== null
            ? explicitList.id
            : (selection.kind === 'list' ? selection.id : undefined)
          requestNotifyPermission()
          setNotifyPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
          const data = await mutate({
            op: 'task.create',
            title: result.text,
            listId,
            dueAt: result.dueAt,
            priority: result.priority,
            tags: result.tag !== null ? [result.tag] : (selection.kind === 'tag' ? [selection.name] : []),
          })
          if (data !== null) {
            setDraft(current => (current === raw ? '' : current))
            if (draftRef.current) draftRef.current.focus()
          }
        })

        const toggle = task => {
          void mutate({ op: 'task.toggle', id: task.id })
        }

        const remove = async task => {
          const data = await mutate({ op: 'task.delete', id: task.id })
          if (data === null) return
          if (detailId === task.id) closeDetail()
          setUndo({ task })
          if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
          undoTimerRef.current = window.setTimeout(() => setUndo(null), 6000)
        }

        const undoRemove = async () => {
          const item = undo
          if (item === null) return
          setUndo(null)
          if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current)
          const data = await mutate({ op: 'task.restore', id: item.task.id })
          if (data === null) setUndo(item)
        }

        const saveDetail = () => runBusy(async () => {
          if (detailId === null || detailDraft === null) return
          const title = detailDraft.title.trim()
          if (title === '') {
            setDetailError('标题不能为空')
            return
          }
          if (detailDraft.repeat !== '' && detailDraft.dueLocal === '') {
            setDetailError('重复任务需要先设置截止时间')
            return
          }
          const dueAt = detailDraft.dueLocal === '' ? null : new Date(detailDraft.dueLocal).getTime()
          if (dueAt !== null && !Number.isFinite(dueAt)) {
            setDetailError('日期格式不正确')
            return
          }
          const current = taskById(detailId)
          // Shift reminders that existed when the drawer opened; reminders the
          // user just added already target the new due time.
          const delta = current !== undefined && dueAt !== null && current.dueAt !== null ? dueAt - current.dueAt : 0
          const reminders = current === undefined
            ? undefined
            : current.reminders.map(reminder => (
              delta !== 0 && initialReminderIdsRef.current.has(reminder.id)
                ? { ...reminder, at: reminder.at + delta, firedAt: null }
                : reminder
            ))
          const data = await mutate({
            op: 'task.update',
            id: detailId,
            title,
            notes: detailDraft.notes,
            listId: detailDraft.listId,
            priority: Number(detailDraft.priority),
            dueAt,
            tags: detailDraft.tags,
            reminders,
            recurrence: detailDraft.repeat === ''
              ? null
              : { kind: detailDraft.repeat, weekdays: detailDraft.repeat === 'weekly' ? detailDraft.weekdays : undefined },
          })
          if (data !== null) closeDetail()
        })

        const saveCreate = () => runBusy(async () => {
          if (createDraft === null) return
          const title = createDraft.title.trim()
          if (title === '') {
            setCreateError('标题不能为空')
            return
          }
          if (createDraft.repeat !== '' && createDraft.dueLocal === '') {
            setCreateError('重复任务需要先设置截止时间')
            return
          }
          const dueAt = createDraft.dueLocal === '' ? null : new Date(createDraft.dueLocal).getTime()
          if (dueAt !== null && !Number.isFinite(dueAt)) {
            setCreateError('日期格式不正确')
            return
          }
          const data = await mutate({
            op: 'task.create',
            title,
            notes: createDraft.notes,
            listId: createDraft.listId,
            priority: Number(createDraft.priority),
            dueAt,
            tags: createDraft.tags,
            subtasks: createDraft.subtasks.split(/[,，\n]+/).map(item => item.trim()).filter(Boolean),
            recurrence: createDraft.repeat === ''
              ? null
              : { kind: createDraft.repeat, weekdays: createDraft.repeat === 'weekly' ? createDraft.weekdays : undefined },
          })
          if (data !== null) closeCreate()
        })

        const addSubtask = () => runBusy(async () => {
          const title = subtaskDraft.trim()
          if (detailId === null || title === '') return
          const data = await mutate({ op: 'subtask.add', id: detailId, title })
          if (data !== null) setSubtaskDraft('')
        })

        const toggleSubtask = item => {
          if (detailId === null) return
          void mutate({ op: 'subtask.toggle', id: detailId, subtaskId: item.id, done: !item.done })
        }

        const toggleInlineSub = (task, item) => {
          void mutate({ op: 'subtask.toggle', id: task.id, subtaskId: item.id, done: !item.done })
        }

        const startAddSub = id => {
          setCollapsedSubs(current => current.filter(value => value !== id))
          setAddSubFor(id)
          setSubDraft('')
        }

        const cancelAddSub = () => {
          setAddSubFor(null)
          setSubDraft('')
        }

        const submitInlineSub = task => runBusy(async () => {
          const title = subDraft.trim()
          if (title === '') return
          const data = await mutate({ op: 'subtask.add', id: task.id, title })
          if (data !== null) setSubDraft('')
        })

        const removeInlineSub = (task, item) => {
          void mutate({ op: 'subtask.remove', id: task.id, subtaskId: item.id })
        }

        const toggleSubs = id => {
          setCollapsedSubs(current => (current.includes(id) ? current.filter(value => value !== id) : [...current, id]))
        }

        const removeSubtask = item => {
          if (detailId === null) return
          void mutate({ op: 'subtask.remove', id: detailId, subtaskId: item.id })
        }

        const addReminder = (minutesBefore) => runBusy(async () => {
          if (detailId === null) return
          const task = taskById(detailId)
          if (task === undefined) return
          if (task.reminders.length >= 5) {
            setDetailError('每个任务最多 5 个提醒')
            return
          }
          const draftDue = detailDraft !== null && detailDraft.dueLocal !== '' ? new Date(detailDraft.dueLocal).getTime() : null
          let at = null
          if (typeof minutesBefore === 'number') {
            if (draftDue === null || !Number.isFinite(draftDue)) {
              setDetailError('先在上方设置截止时间，再按截止时间加提醒')
              return
            }
            at = draftDue - minutesBefore * 60000
          } else {
            at = reminderAt === '' ? null : new Date(reminderAt).getTime()
          }
          if (at === null || !Number.isFinite(at)) {
            setDetailError('提醒时间无效')
            return
          }
          const data = await mutate({ op: 'reminder.add', id: detailId, at })
          if (data !== null) setDetailError('')
        })

        const removeReminder = reminder => {
          if (detailId === null) return
          void mutate({ op: 'reminder.remove', id: detailId, reminderId: reminder.id })
        }

        const snoozeReminder = (reminder, minutes) => {
          if (detailId === null) return
          void mutate({ op: 'reminder.snooze', id: detailId, reminderId: reminder.id, minutes })
        }

        const renameTag = async tag => {
          const to = renameTagValue.trim()
          setRenamingTag(null)
          setRenameTagValue('')
          if (to === '' || to === tag) return
          const data = await mutate({ op: 'tag.rename', from: tag, to })
          if (data !== null && selection.kind === 'tag' && selection.name === tag) {
            setSelection({ kind: 'tag', name: to })
          }
        }

        const deleteTag = async tag => {
          if (confirmTagDelete !== tag) {
            setConfirmTagDelete(tag)
            if (tagTimerRef.current) window.clearTimeout(tagTimerRef.current)
            tagTimerRef.current = window.setTimeout(() => setConfirmTagDelete(null), 3000)
            return
          }
          setConfirmTagDelete(null)
          const data = await mutate({ op: 'tag.delete', name: tag })
          if (data !== null && selection.kind === 'tag' && selection.name === tag) {
            setSelection({ kind: 'view', id: 'all' })
          }
        }

        const createList = async () => {
          const name = listName.trim()
          if (name === '') return
          const before = new Set(lists.map(list => list.id))
          const data = await mutate({ op: 'list.create', name })
          setListName('')
          setAddingList(false)
          if (data !== null) {
            const created = data.state.lists.find(list => !before.has(list.id) && list.name === name)
            if (created) setSelection({ kind: 'list', id: created.id })
          }
        }

        const saveListEdit = async (list) => {
          const name = renameValue.trim()
          const folderId = editFolderId === '' ? null : editFolderId
          setEditingListId(null)
          setRenameValue('')
          setEditFolderId('')
          if (name === '') return
          if (name === list.name && folderId === (list.folderId || null)) return
          await mutate({ op: 'list.update', id: list.id, name, folderId })
        }

        const createFolder = async () => {
          const name = folderName.trim()
          if (name === '') return
          await mutate({ op: 'folder.create', name })
          setFolderName('')
          setAddingFolder(false)
        }

        const renameFolder = async folder => {
          const name = renameFolderValue.trim()
          setRenamingFolderId(null)
          setRenameFolderValue('')
          if (name === '' || name === folder.name) return
          await mutate({ op: 'folder.rename', id: folder.id, name })
        }

        const deleteFolder = async folder => {
          if (confirmFolderDelete !== folder.id) {
            setConfirmFolderDelete(folder.id)
            if (folderTimerRef.current) window.clearTimeout(folderTimerRef.current)
            folderTimerRef.current = window.setTimeout(() => setConfirmFolderDelete(null), 3000)
            return
          }
          setConfirmFolderDelete(null)
          await mutate({ op: 'folder.delete', id: folder.id })
        }

        const toggleFolder = id => {
          setCollapsedFolders(current => (current.includes(id) ? current.filter(value => value !== id) : [...current, id]))
        }

        const setSort = async mode => {
          await mutate({ op: 'settings.update', sort: mode })
        }

        const toggleSelectMode = () => {
          if (selectMode) {
            setSelectedIds([])
            setConfirmBulkDelete(false)
          } else {
            setBulkListId(selection.kind === 'list' ? selection.id : 'inbox')
          }
          setSelectMode(!selectMode)
        }

        const toggleSelected = id => {
          setSelectedIds(current => (current.includes(id) ? current.filter(value => value !== id) : [...current, id]))
        }

        const bulkComplete = () => runBusy(async () => {
          if (selectedIds.length === 0) return
          const data = await mutate({ op: 'task.bulk', bulkAction: 'complete', ids: selectedIds })
          if (data === null) return
          setSelectedIds([])
          setSelectMode(false)
        })

        const bulkDelete = () => {
          if (selectedIds.length === 0) return
          if (!confirmBulkDelete) {
            setConfirmBulkDelete(true)
            return
          }
          return runBusy(async () => {
            const data = await mutate({ op: 'task.bulk', bulkAction: 'delete', ids: selectedIds })
            if (data === null) return
            setSelectedIds([])
            setConfirmBulkDelete(false)
            setSelectMode(false)
          })
        }

        const bulkMove = () => runBusy(async () => {
          if (selectedIds.length === 0 || bulkListId === '') return
          const data = await mutate({ op: 'task.bulk', bulkAction: 'move', ids: selectedIds, listId: bulkListId })
          if (data === null) return
          setSelectedIds([])
          setSelectMode(false)
        })

        const handleKeyDown = event => {
          if (event.defaultPrevented) return
          if (detailDraft !== null || creating) {
            if (event.key === 'Escape') {
              if (creating) closeCreate()
              else requestClose()
            }
            return
          }
          const target = event.target
          const tagName = target && target.tagName
          if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || (target && target.isContentEditable)) {
            if (event.key === 'Escape' && detailDraft !== null) requestClose()
            return
          }
          if (tagName === 'BUTTON' || tagName === 'A') {
            if (event.key === 'Enter' || event.key === ' ') return
            if (event.key === 'Escape' && detailDraft !== null) {
              requestClose()
              return
            }
          }
          if (event.metaKey || event.ctrlKey || event.altKey) return
          if (event.key === 'n') {
            event.preventDefault()
            if (draftRef.current) draftRef.current.focus()
            return
          }
          if (event.key === '/') {
            event.preventDefault()
            if (searchRef.current) searchRef.current.focus()
            return
          }
          if (event.key === 'c') {
            event.preventDefault()
            openCreate()
            return
          }
          if (mode !== 'list') return
          if (event.key === 'j' || event.key === 'k') {
            event.preventDefault()
            setActiveIndex(current => {
              if (rows.length === 0) return -1
              const next = current < 0
                ? (event.key === 'j' ? 0 : rows.length - 1)
                : current + (event.key === 'j' ? 1 : -1)
              return Math.max(0, Math.min(rows.length - 1, next))
            })
            return
          }
          if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0 && rows[activeIndex] !== undefined) {
            event.preventDefault()
            if (selectMode) toggleSelected(rows[activeIndex].id)
            else openDetail(rows[activeIndex])
            return
          }
          if (event.key === 'x' && activeIndex >= 0 && rows[activeIndex] !== undefined) {
            event.preventDefault()
            if (selectMode) toggleSelected(rows[activeIndex].id)
            else toggle(rows[activeIndex])
            return
          }
          if (event.key === 'Escape') {
            if (detailDraft !== null) requestClose()
            else if (selectMode) {
              setSelectMode(false)
              setSelectedIds([])
              setConfirmBulkDelete(false)
            }
          }
        }

        const deleteList = async (list) => {
          if (confirmListDelete !== list.id) {
            setConfirmListDelete(list.id)
            if (listTimerRef.current) window.clearTimeout(listTimerRef.current)
            listTimerRef.current = window.setTimeout(() => setConfirmListDelete(null), 3000)
            return
          }
          setConfirmListDelete(null)
          const data = await mutate({ op: 'list.delete', id: list.id })
          if (data !== null && selection.kind === 'list' && selection.id === list.id) {
            setSelection({ kind: 'view', id: 'all' })
          }
        }

        const navButton = (item, label, count, glyph) => h('button', {
          key: `${item.kind}:${item.id ?? item.name ?? ''}`,
          type: 'button',
          className: 'dsh-todo-nav-row',
          'aria-current': selection.kind === item.kind && (selection.id ?? selection.name) === (item.id ?? item.name) ? 'true' : 'false',
          onClick: () => setSelection(item),
        },
        h('span', { className: 'dsh-todo-nav-glyph', 'aria-hidden': 'true' }, glyph),
        h('span', { className: 'dsh-todo-nav-name' }, label),
        h('span', { className: 'dsh-todo-nav-count' }, count))

        const listRow = (list, nested = false) => {
          const active = selection.kind === 'list' && selection.id === list.id
          if (editingListId === list.id) {
            return h('div', { key: list.id, className: 'dsh-todo-list-editor' },
              h('input', {
                className: 'dsh-todo-nav-input',
                value: renameValue,
                autoFocus: true,
                'aria-label': '重命名清单',
                onChange: event => setRenameValue(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) void saveListEdit(list)
                  if (event.key === 'Escape') { setEditingListId(null); setRenameValue('') }
                },
              }),
              h('select', {
                className: 'dsh-todo-nav-input',
                value: editFolderId,
                'aria-label': '清单所属文件夹',
                onChange: event => setEditFolderId(event.target.value),
              },
              h('option', { value: '' }, '无文件夹'),
              (state.folders || []).map(folder => h('option', { key: folder.id, value: folder.id }, folder.name))),
              h('button', { type: 'button', className: 'dsh-todo-nav-save', onClick: () => { void saveListEdit(list) } }, '保存'))
          }
          return h('div', { key: list.id, className: `dsh-todo-nav-item${nested ? ' dsh-todo-nav-sub' : ''}` },
            h('button', {
              type: 'button',
              className: 'dsh-todo-nav-row',
              'aria-current': active ? 'true' : 'false',
              onClick: () => setSelection({ kind: 'list', id: list.id }),
            },
            h('span', { className: 'dsh-todo-nav-glyph', 'aria-hidden': 'true' }, '☰'),
            h('span', { className: 'dsh-todo-nav-name' }, list.name),
            h('span', { className: 'dsh-todo-nav-count' }, countFor({ kind: 'list', id: list.id }))),
            h('span', { className: 'dsh-todo-nav-actions' },
              h('button', {
                type: 'button',
                title: '重命名或移动清单',
                'aria-label': `重命名或移动清单 ${list.name}`,
                onClick: event => {
                  event.stopPropagation()
                  setEditingListId(list.id)
                  setRenameValue(list.name)
                  setEditFolderId(list.folderId || '')
                },
              }, '✎'),
              list.id === 'inbox' ? null : h('button', {
                type: 'button',
                title: confirmListDelete === list.id ? '再点一次删除' : '删除清单',
                'aria-label': confirmListDelete === list.id ? `再点一次确认删除清单 ${list.name}` : `删除清单 ${list.name}`,
                onClick: event => { event.stopPropagation(); void deleteList(list) },
              }, confirmListDelete === list.id ? '!' : '✕')),
          )
        }

        const folderRow = folder => {
          if (renamingFolderId === folder.id) {
            return h('div', { key: folder.id, className: 'dsh-todo-nav' },
              h('input', {
                className: 'dsh-todo-nav-input',
                value: renameFolderValue,
                autoFocus: true,
                'aria-label': '重命名文件夹',
                onChange: event => setRenameFolderValue(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) void renameFolder(folder)
                  if (event.key === 'Escape') { setRenamingFolderId(null); setRenameFolderValue('') }
                },
                onBlur: () => void renameFolder(folder),
              }))
          }
          const collapsed = collapsedFolders.includes(folder.id)
          const count = listsInFolder(folder.id).reduce((sum, list) => sum + countFor({ kind: 'list', id: list.id }), 0)
          return h('div', { key: folder.id, className: 'dsh-todo-nav-item' },
            h('button', {
              type: 'button',
              className: 'dsh-todo-nav-row dsh-todo-folder-row',
              'aria-expanded': collapsed ? 'false' : 'true',
              onClick: () => toggleFolder(folder.id),
            },
            h('span', { className: 'dsh-todo-nav-glyph', 'aria-hidden': 'true' }, collapsed ? '▸' : '▾'),
            h('span', { className: 'dsh-todo-nav-name' }, folder.name),
            h('span', { className: 'dsh-todo-nav-count' }, count)),
            h('span', { className: 'dsh-todo-nav-actions' },
              h('button', {
                type: 'button',
                title: '重命名文件夹',
                'aria-label': `重命名文件夹 ${folder.name}`,
                onClick: event => { event.stopPropagation(); setRenamingFolderId(folder.id); setRenameFolderValue(folder.name) },
              }, '✎'),
              h('button', {
                type: 'button',
                title: confirmFolderDelete === folder.id ? '再点一次删除' : '删除文件夹',
                'aria-label': confirmFolderDelete === folder.id ? `再点一次确认删除文件夹 ${folder.name}` : `删除文件夹 ${folder.name}`,
                onClick: event => { event.stopPropagation(); void deleteFolder(folder) },
              }, confirmFolderDelete === folder.id ? '!' : '✕')),
          )
        }

        const tagRow = tag => {
          const active = selection.kind === 'tag' && selection.name === tag
          if (renamingTag === tag) {
            return h('div', { key: tag, className: 'dsh-todo-nav' },
              h('input', {
                className: 'dsh-todo-nav-input',
                value: renameTagValue,
                autoFocus: true,
                'aria-label': '重命名标签',
                onChange: event => setRenameTagValue(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) void renameTag(tag)
                  if (event.key === 'Escape') { setRenamingTag(null); setRenameTagValue('') }
                },
                onBlur: () => void renameTag(tag),
              }))
          }
          return h('div', { key: tag, className: 'dsh-todo-nav-item' },
            h('button', {
              type: 'button',
              className: 'dsh-todo-nav-row',
              'aria-current': active ? 'true' : 'false',
              onClick: () => setSelection({ kind: 'tag', name: tag }),
            },
            h('span', { className: 'dsh-todo-nav-glyph', 'aria-hidden': 'true' }, '#'),
            h('span', { className: 'dsh-todo-nav-name' }, tag),
            h('span', { className: 'dsh-todo-nav-count' }, countFor({ kind: 'tag', name: tag }))),
            h('span', { className: 'dsh-todo-nav-actions' },
              h('button', {
                type: 'button',
                title: '重命名标签',
                'aria-label': `重命名标签 ${tag}`,
                onClick: event => { event.stopPropagation(); setRenamingTag(tag); setRenameTagValue(tag) },
              }, '✎'),
              h('button', {
                type: 'button',
                title: confirmTagDelete === tag ? '再点一次删除' : '删除标签',
                'aria-label': confirmTagDelete === tag ? `再点一次确认删除标签 ${tag}` : `删除标签 ${tag}`,
                onClick: event => { event.stopPropagation(); void deleteTag(tag) },
              }, confirmTagDelete === tag ? '!' : '✕')),
          )
        }

        const rowView = (task, index) => {
          const due = task.dueAt === null ? null : formatDue(task.dueAt, now)
          const overdue = task.dueAt !== null && task.status === 'open' && task.dueAt < now
          const priority = priorityLabel(task.priority)
          const list = listById(task.listId)
          const subDone = task.subtasks.filter(item => item.done).length
          const selected = selectedIds.includes(task.id)
          const canDrag = sortMode === 'manual' && !selectMode
          const meta = [
            due === null ? null : h('span', { key: 'due', className: `dsh-todo-due${overdue ? ' overdue' : ''}` }, due),
            priority === '' ? null : h('span', { key: 'pri', className: 'dsh-todo-pri' }, priority),
            task.subtasks.length === 0 ? null : h('button', {
              key: 'subs',
              type: 'button',
              className: 'dsh-todo-subtoggle',
              'aria-expanded': collapsedSubs.includes(task.id) ? 'false' : 'true',
              title: collapsedSubs.includes(task.id) ? '展开子任务' : '收起子任务',
              onClick: event => { event.stopPropagation(); toggleSubs(task.id) },
            }, `${collapsedSubs.includes(task.id) ? '▸' : '▾'} 子任务 ${subDone}/${task.subtasks.length}`),
            task.reminders.length === 0 ? null : (() => {
              const active = task.reminders.filter(reminder => reminder.firedAt === null).length
              return active === 0 ? null : h('span', { key: 'bell', title: '提醒' }, `⏰ ${active}`)
            })(),
            task.recurrence === null ? null : h('span', { key: 'repeat', title: `重复：${task.recurrence.kind}` }, '↻'),
            selection.kind === 'view' || selection.kind === 'tag'
              ? (list ? h('span', { key: 'list' }, list.name) : null)
              : null,
            ...task.tags.map(tag => h('span', { key: `tag:${tag}` }, `#${tag}`)),
          ].filter(Boolean)
          const className = `dsh-todo-row${index === activeIndex ? ' active' : ''}${selected ? ' selected' : ''}${dragId === task.id ? ' dragging' : ''}${dropId === task.id && dragId !== task.id ? ' drop-target' : ''}`
          return h('div', {
            key: task.id,
            className,
            draggable: canDrag,
            onDragStart: canDrag ? event => {
              setDragId(task.id)
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', task.id)
              }
            } : undefined,
            onDragOver: canDrag ? event => {
              event.preventDefault()
              if (dropId !== task.id) setDropId(task.id)
            } : undefined,
            onDragLeave: canDrag ? () => { if (dropId === task.id) setDropId(null) } : undefined,
            onDrop: canDrag ? event => {
              event.preventDefault()
              const source = dragId
              setDragId(null)
              setDropId(null)
              if (source === null || source === task.id) return
              const sourceIndex = rows.findIndex(row => row.id === source)
              const targetIndex = rows.findIndex(row => row.id === task.id)
              if (sourceIndex < 0 || targetIndex < 0) return
              const payload = sourceIndex < targetIndex
                ? { op: 'task.reorder', id: source, afterId: task.id }
                : { op: 'task.reorder', id: source, beforeId: task.id }
              void mutate(payload)
            } : undefined,
            onDragEnd: canDrag ? () => { setDragId(null); setDropId(null) } : undefined,
          },
            selectMode
              ? h('button', {
                type: 'button',
                role: 'checkbox',
                'aria-checked': selected ? 'true' : 'false',
                'aria-label': selected ? `取消选择：${task.title}` : `选择：${task.title}`,
                className: 'dsh-todo-check',
                onClick: () => toggleSelected(task.id),
              }, selected ? '✓' : '')
              : h('button', {
                type: 'button',
                role: 'checkbox',
                'aria-checked': task.status === 'completed' ? 'true' : 'false',
                'aria-label': task.status === 'completed' ? `取消完成：${task.title}` : `完成：${task.title}`,
                className: 'dsh-todo-check',
                onClick: () => toggle(task),
              }, task.status === 'completed' ? '✓' : ''),
            h('div', {
              className: 'dsh-todo-body',
              role: 'button',
              tabIndex: 0,
              'aria-label': `打开：${task.title}`,
              onClick: () => (selectMode ? toggleSelected(task.id) : openDetail(task)),
              onKeyDown: event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (selectMode) toggleSelected(task.id)
                  else openDetail(task)
                }
              },
            },
            h('div', { className: `dsh-todo-text${task.status === 'completed' ? ' done' : ''}` }, task.title),
            meta.length === 0 ? null : h('div', { className: 'dsh-todo-meta' }, meta),
            !collapsedSubs.includes(task.id) && (task.subtasks.length > 0 || addSubFor === task.id)
              ? h('div', { className: 'dsh-todo-inline-subs', onClick: event => event.stopPropagation() },
                task.subtasks.map(item => h('div', { key: item.id, className: `dsh-todo-inline-sub${item.done ? ' done' : ''}` },
                  h('button', {
                    type: 'button',
                    role: 'checkbox',
                    'aria-checked': item.done ? 'true' : 'false',
                    'aria-label': item.done ? `取消完成子任务：${item.title}` : `完成子任务：${item.title}`,
                    className: 'dsh-todo-check',
                    onClick: event => { event.stopPropagation(); void toggleInlineSub(task, item) },
                  }, item.done ? '✓' : ''),
                  h('span', { className: 'dsh-todo-inline-sub-title' }, item.title),
                  h('button', {
                    type: 'button',
                    className: 'dsh-todo-inline-sub-del',
                    'aria-label': `删除子任务：${item.title}`,
                    title: '删除子任务',
                    onClick: event => { event.stopPropagation(); void removeInlineSub(task, item) },
                  }, '✕'))),
                addSubFor === task.id
                  ? h('input', {
                    className: 'dsh-todo-inline-sub-input',
                    value: subDraft,
                    autoFocus: true,
                    placeholder: '子任务，回车添加',
                    'aria-label': '新子任务',
                    onClick: event => event.stopPropagation(),
                    onChange: event => setSubDraft(event.target.value),
                    onKeyDown: event => {
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing) void submitInlineSub(task)
                      if (event.key === 'Escape') cancelAddSub()
                    },
                    onBlur: () => { if (subDraft.trim() === '') cancelAddSub() },
                  })
                  : h('button', {
                    type: 'button',
                    className: 'dsh-todo-inline-sub-add',
                    onClick: event => { event.stopPropagation(); startAddSub(task.id) },
                  }, '＋ 子任务'))
              : null),
            h('button', {
              type: 'button',
              className: 'dsh-todo-addsub',
              'aria-label': `添加子任务：${task.title}`,
              title: '添加子任务',
              onClick: event => { event.stopPropagation(); startAddSub(task.id) },
            }, '＋'),
            h('button', {
              type: 'button',
              className: 'dsh-todo-del',
              'aria-label': `删除：${task.title}`,
              title: '删除',
              onClick: () => { void remove(task) },
            }, '✕'),
          )
        }

        const empty = (() => {
          if (search.trim() !== '') return ['没有匹配的待办', '换个关键词，或者清空搜索。']
          if (selection.kind === 'view' && selection.id === 'today') return ['今天没有待办', '在输入框里写「明天 18:00 交周报」会自动排到明天。']
          if (selection.kind === 'view' && selection.id === 'upcoming') return ['没有未来的待办', '试试「下周一 !1 #工作」这样的写法。']
          if (selection.kind === 'view' && selection.id === 'completed') return ['还没有完成的待办', '勾掉一条，它会出现在这里。']
          if (selection.kind === 'list') return ['这个清单是空的', '在上面的输入框里加一条，或者用 ^清单 把任务放进别的清单。']
          return ['没有待办', '回车即添加；!1 高优、#标签、^清单。']
        })()

        let listBody
        if (!loaded && (saveError || loadError) === '') listBody = h('div', { className: 'dsh-todo-empty' }, '正在读取待办…')
        else if (rows.length > 0) listBody = rows.map(rowView)
        else if ((saveError || loadError) !== '') listBody = null
        else listBody = h('div', { className: 'dsh-todo-empty' },
          h('strong', null, empty[0]),
          empty[1],
          search.trim() !== '' && !(selection.kind === 'view' && selection.id === 'all')
            ? h('button', {
              type: 'button',
              onClick: () => setSelection({ kind: 'view', id: 'all' }),
            }, '在全部中搜索')
            : null)

        const errorText = saveError || loadError
        const taskMeta = task => {
          const due = task.dueAt === null ? null : formatDue(task.dueAt, now)
          const list = listById(task.listId)
          return [
            due === null ? null : h('span', { key: 'due', className: `dsh-todo-due${task.dueAt < now && task.status === 'open' ? ' overdue' : ''}` }, due),
            task.priority === 0 ? null : h('span', { key: 'pri', className: 'dsh-todo-pri' }, priorityLabel(task.priority)),
            task.subtasks.length === 0 ? null : h('span', { key: 'subs' }, `☑ ${task.subtasks.filter(item => item.done).length}/${task.subtasks.length}`),
            list ? h('span', { key: 'list' }, list.name) : null,
            ...task.tags.map(tag => h('span', { key: `tag:${tag}` }, `#${tag}`)),
          ].filter(Boolean)
        }

        const cardView = (task, draggable = true) => h('div', {
          key: task.id,
          className: 'dsh-todo-card',
          draggable,
          onClick: () => openDetail(task),
          onDragStart: draggable ? event => {
            setBoardDragId(task.id)
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', task.id)
            }
          } : undefined,
          onDragEnd: draggable ? () => setBoardDragId(null) : undefined,
        },
        h('div', { className: 'dsh-todo-card-head' },
          h('button', {
            type: 'button',
            role: 'checkbox',
            'aria-checked': task.status === 'completed' ? 'true' : 'false',
            'aria-label': task.status === 'completed' ? `取消完成：${task.title}` : `完成：${task.title}`,
            className: 'dsh-todo-check dsh-todo-card-check',
            onClick: event => { event.stopPropagation(); toggle(task) },
          }, task.status === 'completed' ? '✓' : ''),
          h('span', { className: `dsh-todo-card-title${task.status === 'completed' ? ' done' : ''}` }, task.title)),
        h('div', { className: 'dsh-todo-meta' }, taskMeta(task)),
        h('div', { className: 'dsh-todo-card-subs', onClick: event => event.stopPropagation() },
          task.subtasks.slice(0, 3).map(item => h('div', { key: item.id, className: `dsh-todo-card-sub${item.done ? ' done' : ''}` },
            h('button', {
              type: 'button',
              role: 'checkbox',
              'aria-checked': item.done ? 'true' : 'false',
              'aria-label': item.done ? `取消完成子任务：${item.title}` : `完成子任务：${item.title}`,
              className: 'dsh-todo-check dsh-todo-card-subcheck',
              onClick: event => { event.stopPropagation(); void toggleInlineSub(task, item) },
            }, item.done ? '✓' : ''),
            h('span', { className: 'dsh-todo-card-subtext' }, item.title),
            h('button', {
              type: 'button',
              className: 'dsh-todo-card-subdel',
              'aria-label': `删除子任务：${item.title}`,
              onClick: event => { event.stopPropagation(); void removeInlineSub(task, item) },
            }, '✕'))),
          task.subtasks.length > 3 ? h('div', { className: 'dsh-todo-card-sub' }, `…还有 ${task.subtasks.length - 3} 项`) : null,
          addSubFor === task.id
            ? h('input', {
              className: 'dsh-todo-card-subinput',
              value: subDraft,
              autoFocus: true,
              placeholder: '子任务，回车',
              'aria-label': '新子任务',
              onClick: event => event.stopPropagation(),
              onChange: event => setSubDraft(event.target.value),
              onKeyDown: event => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) void submitInlineSub(task)
                if (event.key === 'Escape') cancelAddSub()
              },
              onBlur: () => { if (subDraft.trim() === '') cancelAddSub() },
            })
            : h('button', {
              type: 'button',
              className: 'dsh-todo-card-subadd',
              onClick: event => { event.stopPropagation(); startAddSub(task.id) },
            }, '＋ 子任务')))

        const dropOnColumn = column => {
          if (boardDragId === null) return
          const task = taskById(boardDragId)
          setBoardDragId(null)
          if (task === undefined) return
          if (boardBy === 'list') void mutate({ op: 'task.update', id: task.id, listId: column })
          else void mutate({ op: 'task.update', id: task.id, priority: Number(column) })
        }

        const boardView = () => {
          const columns = boardBy === 'list'
            ? lists.map(list => ({ key: list.id, title: list.name, rows: rows.filter(task => task.listId === list.id) }))
            : [3, 2, 1, 0].map(priority => ({ key: String(priority), title: priorityLabel(priority) || '无优先级', rows: rows.filter(task => task.priority === priority) }))
          const columnNodes = columns.map(column => h('div', {
            key: column.key,
            className: 'dsh-todo-board-col',
            onDragOver: event => event.preventDefault(),
            onDrop: event => { event.preventDefault(); dropOnColumn(column.key) },
          },
          h('div', { className: 'dsh-todo-board-col-head' },
            h('span', null, column.title),
            h('span', { className: 'dsh-todo-nav-count' }, column.rows.length)),
          column.rows.length === 0
            ? h('div', { className: 'dsh-todo-board-empty' }, '拖动任务到这里')
            : column.rows.map(task => cardView(task))))
          return h('div', { className: 'dsh-todo-board-wrap' },
            h('div', { className: 'dsh-todo-viewbar' },
              h('span', null, '分组'),
              h('select', {
                value: boardBy,
                'aria-label': '看板分组',
                onChange: event => setBoardBy(event.target.value),
              },
              h('option', { value: 'priority' }, '按优先级'),
              h('option', { value: 'list' }, '按清单'))),
            h('div', { className: 'dsh-todo-board' }, columnNodes))
        }

        const shiftCalendar = delta => {
          const current = new Date(calendarMonth)
          if (calendarMode === 'month') {
            setCalendarMonth(new Date(current.getFullYear(), current.getMonth() + delta, 1).getTime())
          } else if (calendarMode === 'week') {
            current.setDate(current.getDate() + delta * 7)
            setCalendarMonth(current.getTime())
          } else {
            current.setDate(current.getDate() + delta)
            setCalendarMonth(current.getTime())
          }
        }

        const dayKey = ms => {
          const date = new Date(ms)
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        }

        const dropOnDay = day => {
          if (boardDragId === null) return
          const task = taskById(boardDragId)
          setBoardDragId(null)
          if (task === undefined) return
          const target = new Date(day)
          if (task.dueAt !== null) {
            const old = new Date(task.dueAt)
            target.setHours(old.getHours(), old.getMinutes(), 0, 0)
          } else {
            target.setHours(23, 59, 59, 999)
          }
          void mutate({ op: 'task.update', id: task.id, dueAt: target.getTime() })
        }

        const dropOnHour = (day, hour) => {
          if (boardDragId === null) return
          const task = taskById(boardDragId)
          setBoardDragId(null)
          if (task === undefined) return
          const target = new Date(day)
          target.setHours(hour, 0, 0, 0)
          void mutate({ op: 'task.update', id: task.id, dueAt: target.getTime() })
        }

        const calendarChip = (task, showTime) => {
          const dateOnly = task.dueAt !== null && new Date(task.dueAt).getHours() === 23 && new Date(task.dueAt).getMinutes() === 59
          const time = task.dueAt === null ? '' : dateOnly ? '全天' : `${String(new Date(task.dueAt).getHours()).padStart(2, '0')}:${String(new Date(task.dueAt).getMinutes()).padStart(2, '0')}`
          return h('div', {
            key: task.id,
            className: 'dsh-todo-cal-task',
            title: `${time === '' ? '' : `${time} `}${task.title}`,
            draggable: true,
            onDragStart: event => {
              setBoardDragId(task.id)
              if (event.dataTransfer) event.dataTransfer.setData('text/plain', task.id)
            },
            onDragEnd: () => setBoardDragId(null),
            onClick: () => openDetail(task),
          },
          showTime && time !== '' ? h('span', { className: 'dsh-todo-week-time' }, time) : null,
          task.title)
        }

        const calendarView = () => {
          const anchor = new Date(calendarMonth)
          const byDay = new Map()
          for (const task of rows) {
            if (task.dueAt === null) continue
            const key = dayKey(task.dueAt)
            if (!byDay.has(key)) byDay.set(key, [])
            byDay.get(key).push(task)
          }
          for (const list of byDay.values()) list.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0))
          const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']
          let label
          if (calendarMode === 'month') {
            label = `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`
          } else if (calendarMode === 'week') {
            const offset = (anchor.getDay() + 6) % 7
            const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset)
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
            label = `${start.getFullYear()} 年 ${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`
          } else {
            label = `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月 ${anchor.getDate()} 日 ${WEEK[anchor.getDay()]}`
          }
          const header = h('div', { className: 'dsh-todo-viewbar' },
            h('select', {
              value: calendarMode,
              'aria-label': '日历范围',
              onChange: event => setCalendarMode(event.target.value),
            },
            h('option', { value: 'month' }, '月'),
            h('option', { value: 'week' }, '周'),
            h('option', { value: 'day' }, '日')),
            h('button', { type: 'button', onClick: () => shiftCalendar(-1), 'aria-label': '上一段' }, '‹'),
            h('strong', null, label),
            h('button', { type: 'button', onClick: () => shiftCalendar(1), 'aria-label': '下一段' }, '›'),
            h('button', {
              type: 'button',
              onClick: () => { const date = new Date(); setCalendarMonth(date.getTime()) },
            }, '今天'))

          if (calendarMode === 'month') {
            const year = anchor.getFullYear()
            const month = anchor.getMonth()
            const first = new Date(year, month, 1)
            const offset = (first.getDay() + 6) % 7
            const days = new Date(year, month + 1, 0).getDate()
            const cells = []
            for (let index = 0; index < offset; index += 1) cells.push(null)
            for (let day = 1; day <= days; day += 1) cells.push(new Date(year, month, day))
            return h('div', { className: 'dsh-todo-cal-wrap' },
              header,
              h('div', { className: 'dsh-todo-cal' },
                weekdayNames.map(name => h('div', { key: name, className: 'dsh-todo-cal-week' }, `周${name}`)),
                cells.map((date, index) => {
                  if (date === null) return h('div', { key: `blank-${index}`, className: 'dsh-todo-cal-day blank' })
                  const key = dayKey(date.getTime())
                  const tasks = byDay.get(key) || []
                  return h('div', {
                    key,
                    className: 'dsh-todo-cal-day',
                    onDragOver: event => event.preventDefault(),
                    onDrop: event => { event.preventDefault(); dropOnDay(date.getTime()) },
                  },
                  h('div', { className: 'dsh-todo-cal-date' }, date.getDate()),
                  tasks.slice(0, 4).map(task => calendarChip(task, false)),
                  tasks.length > 4 ? h('div', { className: 'dsh-todo-cal-more' }, `+${tasks.length - 4}`) : null)
                })))
          }

          if (calendarMode === 'week') {
            const offset = (anchor.getDay() + 6) % 7
            const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset)
            const weekDays = Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
            return h('div', { className: 'dsh-todo-cal-wrap' },
              header,
              h('div', { className: 'dsh-todo-week' },
                weekDays.map(day => h('div', { key: `head-${dayKey(day.getTime())}`, className: 'dsh-todo-week-head' },
                  h('span', null, `周${weekdayNames[(day.getDay() + 6) % 7]}`),
                  h('span', null, `${day.getMonth() + 1}/${day.getDate()}`))),
                weekDays.map(day => {
                  const tasks = byDay.get(dayKey(day.getTime())) || []
                  return h('div', {
                    key: dayKey(day.getTime()),
                    className: 'dsh-todo-week-col',
                    onDragOver: event => event.preventDefault(),
                    onDrop: event => { event.preventDefault(); dropOnDay(day.getTime()) },
                  },
                  tasks.length === 0
                    ? h('div', { className: 'dsh-todo-cal-more' }, '—')
                    : tasks.map(task => calendarChip(task, true)))
                })))
          }

          const day = new Date(anchor)
          day.setHours(0, 0, 0, 0)
          const dayTasks = byDay.get(dayKey(day.getTime())) || []
          const allDay = dayTasks.filter(task => {
            const date = new Date(task.dueAt)
            return date.getHours() === 23 && date.getMinutes() === 59
          })
          const timed = dayTasks.filter(task => !allDay.includes(task))
          const hours = Array.from({ length: 24 }, (_, hour) => hour)
          const hourNodes = hours.map(hour => h('div', {
            key: hour,
            className: 'dsh-todo-hour-row',
            onDragOver: event => event.preventDefault(),
            onDrop: event => { event.preventDefault(); dropOnHour(day.getTime(), hour) },
          },
          h('div', { className: 'dsh-todo-hour-label' }, `${String(hour).padStart(2, '0')}:00`),
          h('div', { className: 'dsh-todo-hour-tasks' },
            timed.filter(task => new Date(task.dueAt).getHours() === hour).map(task => calendarChip(task, true)))))
          const allDayNode = h('div', { className: 'dsh-todo-day-all' },
            h('div', { className: 'dsh-todo-cal-date' }, '全天'),
            allDay.length === 0 ? null : allDay.map(task => calendarChip(task, false)))
          return h('div', { className: 'dsh-todo-cal-wrap' },
            header,
            h('div', { className: 'dsh-todo-day' }, allDayNode, hourNodes))
        }

        const matrixView = () => {
          const urgent = task => task.dueAt !== null && task.dueAt <= endOfDay(now + 2 * DAY)
          const important = task => task.priority >= 2
          const quadrants = [
            { key: 'do', title: '重要 · 紧急', rows: rows.filter(task => important(task) && urgent(task)) },
            { key: 'plan', title: '重要 · 不紧急', rows: rows.filter(task => important(task) && !urgent(task)) },
            { key: 'delegate', title: '不重要 · 紧急', rows: rows.filter(task => !important(task) && urgent(task)) },
            { key: 'drop', title: '不重要 · 不紧急', rows: rows.filter(task => !important(task) && !urgent(task)) },
          ]
          return h('div', { className: 'dsh-todo-matrix' },
            quadrants.map(quadrant => h('div', { key: quadrant.key, className: 'dsh-todo-matrix-cell' },
              h('div', { className: 'dsh-todo-board-col-head' },
                h('span', null, quadrant.title),
                h('span', { className: 'dsh-todo-nav-count' }, quadrant.rows.length)),
              quadrant.rows.length === 0
                ? h('div', { className: 'dsh-todo-board-empty' }, '没有任务')
                : quadrant.rows.map(task => cardView(task, false)))))
        }

        const statsView = () => {
          const completed = liveTasks.filter(task => task.status === 'completed' && task.completedAt !== null)
          const buckets = []
          for (let offset = 29; offset >= 0; offset -= 1) {
            const date = new Date(now)
            date.setDate(date.getDate() - offset)
            date.setHours(0, 0, 0, 0)
            const next = new Date(date)
            next.setDate(next.getDate() + 1)
            next.setHours(0, 0, 0, 0)
            buckets.push({
              label: `${date.getMonth() + 1}/${date.getDate()}`,
              count: completed.filter(task => task.completedAt >= date.getTime() && task.completedAt < next.getTime()).length,
            })
          }
          const max = Math.max(1, ...buckets.map(bucket => bucket.count))
          const open = stats.open ?? liveTasks.filter(task => task.status === 'open').length
          const done = stats.done ?? completed.length
          const rate = open + done === 0 ? 0 : Math.round((done / (open + done)) * 100)
          const byList = lists.map(list => ({
            id: list.id,
            name: list.name,
            count: liveTasks.filter(task => task.status === 'open' && task.listId === list.id).length,
          })).filter(item => item.count > 0).sort((a, b) => b.count - a.count)
          const byTag = tagList.map(tag => ({
            name: tag,
            count: liveTasks.filter(task => task.status === 'open' && task.tags.includes(tag)).length,
          })).filter(item => item.count > 0).sort((a, b) => b.count - a.count)
          return h('div', { className: 'dsh-todo-stats' },
            h('div', { className: 'dsh-todo-stat-cards' },
              h('div', { className: 'dsh-todo-stat-card' }, h('strong', null, String(open)), h('span', null, '未完成')),
              h('div', { className: 'dsh-todo-stat-card' }, h('strong', null, String(done)), h('span', null, '已完成')),
              h('div', { className: 'dsh-todo-stat-card' }, h('strong', null, String(stats.overdue || 0)), h('span', null, '逾期')),
              h('div', { className: 'dsh-todo-stat-card' }, h('strong', null, `${rate}%`), h('span', null, '完成率'))),
            h('div', { className: 'dsh-todo-stat-section' },
              h('div', { className: 'dsh-todo-rail-title' }, '近 30 天完成'),
              h('div', { className: 'dsh-todo-chart' },
                buckets.map(bucket => h('div', {
                  key: bucket.label,
                  className: 'dsh-todo-bar',
                  style: { height: `${Math.round((bucket.count / max) * 100)}%` },
                  title: `${bucket.label}：${bucket.count} 条`,
                })))),
            h('div', { className: 'dsh-todo-stat-section' },
              h('div', { className: 'dsh-todo-rail-title' }, '未完成 · 按清单'),
              byList.length === 0 ? h('div', { className: 'dsh-todo-stat-empty' }, '没有未完成任务') : byList.map(item => h('div', { key: item.id, className: 'dsh-todo-stat-row' },
                h('span', null, item.name),
                h('span', { className: 'dsh-todo-nav-count' }, item.count)))),
            h('div', { className: 'dsh-todo-stat-section' },
              h('div', { className: 'dsh-todo-rail-title' }, '未完成 · 按标签'),
              byTag.length === 0 ? h('div', { className: 'dsh-todo-stat-empty' }, '没有标签') : byTag.map(item => h('div', { key: item.name, className: 'dsh-todo-stat-row' },
                h('span', null, `#${item.name}`),
                h('span', { className: 'dsh-todo-nav-count' }, item.count)))))
        }


        const smartItems = [
          { item: { kind: 'view', id: 'today' }, label: '今天', glyph: '☀' },
          { item: { kind: 'view', id: 'upcoming' }, label: '最近 7 天', glyph: '▤' },
          { item: { kind: 'view', id: 'all' }, label: '全部', glyph: '≡' },
          { item: { kind: 'view', id: 'completed' }, label: '已完成', glyph: '✓' },
        ]

        return h('div', { className: 'dsh-todo-page', onKeyDown: handleKeyDown },
          h('style', null, CSS),
          h('aside', { className: 'dsh-todo-rail' },
            h('div', { className: 'dsh-todo-rail-title' }, '智能清单'),
            h('div', { className: 'dsh-todo-nav' },
              smartItems.map(entry => navButton(entry.item, entry.label, countFor(entry.item), entry.glyph))),
            h('div', { className: 'dsh-todo-rail-title' }, '文件夹',
              h('button', { type: 'button', title: '新建文件夹', 'aria-label': '新建文件夹', onClick: () => setAddingFolder(true) }, '+')),
            h('div', { className: 'dsh-todo-nav' },
              addingFolder
                ? h('input', {
                  className: 'dsh-todo-nav-input',
                  value: folderName,
                  autoFocus: true,
                  placeholder: '文件夹名称',
                  'aria-label': '新文件夹名称',
                  onChange: event => setFolderName(event.target.value),
                  onKeyDown: event => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) void createFolder()
                    if (event.key === 'Escape') { setAddingFolder(false); setFolderName('') }
                  },
                  onBlur: () => { if (folderName.trim() === '') { setAddingFolder(false); setFolderName('') } },
                })
                : null,
              folders.flatMap(folder => {
                const items = [folderRow(folder)]
                if (!collapsedFolders.includes(folder.id)) {
                  items.push(...listsInFolder(folder.id).map(list => listRow(list, true)))
                }
                return items
              })),
            h('div', { className: 'dsh-todo-rail-title' }, '清单',
              h('button', { type: 'button', title: '新建清单', 'aria-label': '新建清单', onClick: () => setAddingList(true) }, '+')),
            h('div', { className: 'dsh-todo-nav' },
              addingList
                ? h('input', {
                  className: 'dsh-todo-nav-input',
                  value: listName,
                  autoFocus: true,
                  placeholder: '清单名称',
                  'aria-label': '新清单名称',
                  onChange: event => setListName(event.target.value),
                  onKeyDown: event => {
                    if (event.key === 'Enter' && !event.nativeEvent.isComposing) void createList()
                    if (event.key === 'Escape') { setAddingList(false); setListName('') }
                  },
                  onBlur: () => { if (listName.trim() === '') { setAddingList(false); setListName('') } },
                })
                : null,
              ungroupedLists.map(list => listRow(list))),
            tagList.length === 0 ? null : h('div', { className: 'dsh-todo-rail-title' }, '标签'),
            tagList.length === 0 ? null : h('div', { className: 'dsh-todo-nav' }, tagList.map(tagRow)),
          ),
          h('main', { className: 'dsh-todo-main' },
            h('div', { className: 'dsh-todo-head' },
              h('div', { className: 'dsh-todo-title-row' },
                h('h2', { className: 'dsh-todo-title' }, title),
                h('span', { className: 'dsh-todo-count' }, `${rows.length} 条${stats.overdue ? ` · ${stats.overdue} 条逾期` : ''}`),
                h('select', {
                  className: 'dsh-todo-view-select',
                  value: mode,
                  'aria-label': '视图',
                  onChange: event => setMode(event.target.value),
                },
                h('option', { value: 'list' }, '列表'),
                h('option', { value: 'board' }, '看板'),
                h('option', { value: 'calendar' }, '日历'),
                h('option', { value: 'matrix' }, '四象限'),
                h('option', { value: 'stats' }, '统计')),
                h('button', {
                  type: 'button',
                  className: 'dsh-todo-new',
                  title: '新建待办（快捷键 c）',
                  onClick: openCreate,
                }, '＋ 新建'),
                h('select', {
                  className: 'dsh-todo-sort',
                  value: sortMode,
                  'aria-label': '排序方式',
                  onChange: event => { void setSort(event.target.value) },
                },
                h('option', { value: 'smart' }, '智能排序'),
                h('option', { value: 'manual' }, '手动排序'),
                h('option', { value: 'due' }, '按截止日期')),
                mode === 'list' ? h('button', {
                  type: 'button',
                  className: 'dsh-todo-batch',
                  'aria-pressed': selectMode ? 'true' : 'false',
                  onClick: toggleSelectMode,
                }, selectMode ? '退出批量' : '批量') : null,
                h('input', {
                  ref: searchRef,
                  className: 'dsh-todo-search',
                  value: search,
                  type: 'search',
                  placeholder: '搜索',
                  'aria-label': '搜索待办',
                  onChange: event => setSearch(event.target.value),
                }),
              ),
            ),
            h('div', { className: 'dsh-todo-add' },
              h('input', {
                ref: draftRef,
                className: 'dsh-todo-input',
                value: draft,
                placeholder: '添加待办，回车；支持 明天 18:00 · !1 · #工作 · ^工作',
                'aria-label': '添加待办',
                onChange: event => {
                  setDraft(event.target.value)
                  if (hint !== '') setHint('')
                },
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) void submit()
                  if (event.key === 'Escape') setDraft('')
                },
              }),
              h('div', { className: 'dsh-todo-preview' },
                hint !== ''
                  ? h('span', { className: 'dsh-todo-hint', role: 'alert' }, hint)
                  : parsed === null ? null : [
                    parsed.dueAt === null ? null : h('span', { key: 'due', className: 'dsh-todo-chip strong' }, formatDue(parsed.dueAt, now)),
                    parsed.priority === 0 ? null : h('span', { key: 'pri', className: 'dsh-todo-chip' }, priorityLabel(parsed.priority)),
                    parsed.listName === null ? null : h('span', { key: 'list', className: 'dsh-todo-chip' }, `^${parsed.listName}`),
                    parsed.tag === null ? null : h('span', { key: 'tag', className: 'dsh-todo-chip' }, `#${parsed.tag}`),
                    parsed.text === ''
                      ? h('span', { key: 'text', className: 'dsh-todo-hint' }, '再写一句要做什么')
                      : h('span', { key: 'text', className: 'dsh-todo-chip' }, parsed.text.length > 40 ? `${parsed.text.slice(0, 40)}…` : parsed.text),
                  ].filter(Boolean),
              ),
            ),
            selectMode && mode === 'list' ? h('div', { className: 'dsh-todo-bulk' },
              h('span', null, `已选 ${selectedIds.length} 条`),
              h('button', { type: 'button', disabled: selectedIds.length === 0, onClick: () => { void bulkComplete() } }, '完成'),
              h('select', {
                value: bulkListId,
                'aria-label': '批量移动到清单',
                onChange: event => setBulkListId(event.target.value),
              }, lists.map(list => h('option', { key: list.id, value: list.id }, list.name))),
              h('button', { type: 'button', disabled: selectedIds.length === 0, onClick: () => { void bulkMove() } }, '移动'),
              h('button', {
                type: 'button',
                className: 'danger',
                disabled: selectedIds.length === 0,
                onClick: () => { void bulkDelete() },
              }, confirmBulkDelete ? '确认删除' : '删除'),
              h('button', {
                type: 'button',
                onClick: () => {
                  setSelectMode(false)
                  setSelectedIds([])
                  setConfirmBulkDelete(false)
                },
              }, '取消')) : null,
            errorText === '' ? null : h('div', { className: 'dsh-todo-error', role: 'alert' }, errorText),
            undo === null ? null : h('div', { className: 'dsh-todo-undo', role: 'status' },
              h('span', null, `已删除「${undo.task.title}」`),
              h('button', { type: 'button', onClick: () => { void undoRemove() } }, '撤销')),
            h('div', { className: mode === 'list' ? 'dsh-todo-list' : 'dsh-todo-view', role: 'region', 'aria-label': title },
              mode === 'list'
                ? listBody
                : mode === 'board'
                  ? boardView()
                  : mode === 'calendar'
                    ? calendarView()
                    : mode === 'matrix'
                      ? matrixView()
                      : statsView()),
            h('div', { className: 'dsh-todo-foot' },
              h('span', null, '本机存储 · Agent 可用 todo_manage 读写'),
              typeof Notification !== 'undefined' && notifyPermission === 'default'
                ? h('button', { type: 'button', onClick: enableNotifications }, '开启到期提醒')
                : null),
          ),
          detailDraft === null ? null : (() => {
            const task = taskById(detailId)
            if (task === undefined) return null
            const weekdayLabels = [['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['日', 7]]
            const weekdayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' }
            let repeatSummary = ''
            if (detailDraft.repeat !== '' && detailDraft.dueLocal !== '') {
              const repeatDate = new Date(detailDraft.dueLocal)
              if (detailDraft.repeat === 'daily') repeatSummary = '每天'
              else if (detailDraft.repeat === 'weekdays') repeatSummary = '每个工作日'
              else if (detailDraft.repeat === 'weekly') {
                repeatSummary = detailDraft.weekdays.length === 0
                  ? `每周（默认 ${weekdayNames[repeatDate.getDay() === 0 ? 7 : repeatDate.getDay()]}）`
                  : `每周 ${detailDraft.weekdays.map(day => weekdayNames[day]).join('、')}`
              } else if (detailDraft.repeat === 'monthly') repeatSummary = `每月 ${repeatDate.getDate()} 日`
              else if (detailDraft.repeat === 'yearly') repeatSummary = `每年 ${repeatDate.getMonth() + 1} 月 ${repeatDate.getDate()} 日`
            }
            const activeReminders = task.reminders.filter(reminder => reminder.firedAt === null).length
            return h('aside', { key: detailId, className: 'dsh-todo-detail', 'aria-label': '任务详情' },
              h('div', { className: 'dsh-todo-detail-head' },
                h('strong', null, '任务详情'),
                confirmClose
                  ? h('span', { className: 'dsh-todo-detail-hint' }, '再点关闭会丢弃修改')
                  : detailDirty() ? h('span', { className: 'dsh-todo-detail-hint' }, '未保存') : null,
                h('button', {
                  type: 'button',
                  'aria-label': confirmClose ? '确认放弃修改并关闭' : '关闭详情',
                  onClick: requestClose,
                }, '✕')),
              h('div', { className: 'dsh-todo-detail-body' },
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-title' }, '标题'),
                  h('input', {
                    id: 'dsh-todo-detail-title',
                    value: detailDraft.title,
                    autoFocus: true,
                    onChange: event => setDetailDraft(current => ({ ...current, title: event.target.value })),
                    onKeyDown: event => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void saveDetail()
                      if (event.key === 'Escape') requestClose()
                    },
                  })),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-notes' }, '备注'),
                  h('textarea', {
                    id: 'dsh-todo-detail-notes',
                    value: detailDraft.notes,
                    placeholder: 'Markdown 文本',
                    onChange: event => setDetailDraft(current => ({ ...current, notes: event.target.value })),
                  })),
                h('div', { className: 'dsh-todo-field' },
                  h('label', null, `子任务${task.subtasks.length === 0 ? '' : ` · ${task.subtasks.filter(item => item.done).length}/${task.subtasks.length}`}`),
                  task.subtasks.length === 0 ? null : h('div', { className: 'dsh-todo-sublist' },
                    task.subtasks.map(item => h('div', { key: item.id, className: 'dsh-todo-subrow' },
                      h('button', {
                        type: 'button',
                        role: 'checkbox',
                        'aria-checked': item.done ? 'true' : 'false',
                        'aria-label': item.done ? `取消完成子任务：${item.title}` : `完成子任务：${item.title}`,
                        className: 'dsh-todo-check dsh-todo-subcheck',
                        onClick: () => toggleSubtask(item),
                      }, item.done ? '✓' : ''),
                      h('span', { className: `dsh-todo-subtext${item.done ? ' done' : ''}` }, item.title),
                      h('button', {
                        type: 'button',
                        className: 'dsh-todo-sublist-del',
                        'aria-label': `删除子任务：${item.title}`,
                        onClick: () => removeSubtask(item),
                      }, '✕')))),
                  h('div', { className: 'dsh-todo-inline' },
                    h('input', {
                      value: subtaskDraft,
                      placeholder: '加子任务，回车',
                      'aria-label': '新子任务',
                      onChange: event => setSubtaskDraft(event.target.value),
                      onKeyDown: event => {
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) void addSubtask()
                      },
                    }),
                    h('button', { type: 'button', disabled: busy, onClick: () => { void addSubtask() } }, '添加'))),
                h('div', { className: 'dsh-todo-field' },
                  h('label', null, `提醒 ${activeReminders}/5`),
                  task.reminders.length === 0 ? null : h('div', { className: 'dsh-todo-sublist' },
                    task.reminders.map(reminder => h('div', { key: reminder.id, className: 'dsh-todo-subrow' },
                      h('span', { className: 'dsh-todo-reminder-time' }, formatReminder(reminder.at)),
                      h('span', { className: 'dsh-todo-reminder-state' }, reminder.firedAt !== null ? '已提醒' : reminder.at <= now ? '已到期' : '待提醒'),
                      reminder.firedAt !== null || reminder.at <= now
                        ? h('button', {
                          type: 'button',
                          className: 'dsh-todo-subaction',
                          onClick: () => snoozeReminder(reminder, 10),
                        }, '推迟10分')
                        : null,
                      h('button', {
                        type: 'button',
                        className: 'dsh-todo-sublist-del',
                        'aria-label': '删除提醒',
                        onClick: () => removeReminder(reminder),
                      }, '✕')))),
                  h('div', { className: 'dsh-todo-inline' },
                    h('input', {
                      type: 'datetime-local',
                      value: reminderAt,
                      'aria-label': '提醒时间',
                      onChange: event => setReminderAt(event.target.value),
                    }),
                    h('button', { type: 'button', disabled: busy || activeReminders >= 5, onClick: () => { void addReminder() } }, '加提醒')),
                  h('div', { className: 'dsh-todo-inline' },
                    h('button', { type: 'button', disabled: busy || activeReminders >= 5, onClick: () => { void addReminder(0) } }, '截止时'),
                    h('button', { type: 'button', disabled: busy || activeReminders >= 5, onClick: () => { void addReminder(60) } }, '提前 1 小时'),
                    h('button', { type: 'button', disabled: busy || activeReminders >= 5, onClick: () => { void addReminder(1440) } }, '提前 1 天'))),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-list' }, '清单'),
                  h('select', {
                    id: 'dsh-todo-detail-list',
                    value: detailDraft.listId,
                    onChange: event => setDetailDraft(current => ({ ...current, listId: event.target.value })),
                  }, lists.map(list => h('option', { key: list.id, value: list.id }, list.name)))),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-priority' }, '优先级'),
                  h('select', {
                    id: 'dsh-todo-detail-priority',
                    value: detailDraft.priority,
                    onChange: event => setDetailDraft(current => ({ ...current, priority: event.target.value })),
                  },
                  h('option', { value: '0' }, '无'),
                  h('option', { value: '1' }, '低'),
                  h('option', { value: '2' }, '中'),
                  h('option', { value: '3' }, '高'))),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-due' }, '截止'),
                  h('div', { className: 'dsh-todo-inline' },
                    h('input', {
                      id: 'dsh-todo-detail-due',
                      type: 'datetime-local',
                      value: detailDraft.dueLocal,
                      onChange: event => setDetailDraft(current => ({ ...current, dueLocal: event.target.value })),
                    }),
                    h('button', { type: 'button', onClick: () => setDetailDraft(current => ({ ...current, dueLocal: '' })) }, '清除'))),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-repeat' }, '重复'),
                  h('select', {
                    id: 'dsh-todo-detail-repeat',
                    value: detailDraft.repeat,
                    onChange: event => setDetailDraft(current => ({ ...current, repeat: event.target.value })),
                  },
                  h('option', { value: '' }, '不重复'),
                  h('option', { value: 'daily' }, '每天'),
                  h('option', { value: 'weekdays' }, '工作日'),
                  h('option', { value: 'weekly' }, '每周'),
                  h('option', { value: 'monthly' }, '每月'),
                  h('option', { value: 'yearly' }, '每年')),
                  detailDraft.repeat === 'weekly'
                    ? h('div', { className: 'dsh-todo-days', role: 'group', 'aria-label': '每周重复的星期' },
                      weekdayLabels.map(([label, day]) => h('button', {
                        key: day,
                        type: 'button',
                        className: 'dsh-todo-day',
                        'aria-pressed': detailDraft.weekdays.includes(day) ? 'true' : 'false',
                        'aria-label': `周${label}`,
                        title: `周${label}`,
                        onClick: () => setDetailDraft(current => ({
                          ...current,
                          weekdays: current.weekdays.includes(day)
                            ? current.weekdays.filter(value => value !== day)
                            : [...current.weekdays, day].sort((a, b) => a - b),
                        })),
                      }, label)))
                    : null,
                  repeatSummary === ''
                    ? null
                    : h('span', { className: 'dsh-todo-repeat-summary' }, repeatSummary),
                  detailDraft.repeat !== '' && detailDraft.dueLocal === ''
                    ? h('span', { className: 'dsh-todo-hint' }, '重复需要先设置截止时间')
                    : null),
                h('div', { className: 'dsh-todo-field' },
                  h('label', { htmlFor: 'dsh-todo-detail-tags' }, '标签'),
                  h('input', {
                    id: 'dsh-todo-detail-tags',
                    value: detailDraft.tags,
                    placeholder: '逗号分隔',
                    onChange: event => setDetailDraft(current => ({ ...current, tags: event.target.value })),
                  }))),
              detailError === '' && saveError === '' ? null : h('div', { className: 'dsh-todo-error', role: 'alert', style: { margin: '0 14px 8px' } }, detailError || saveError),
              h('div', { className: 'dsh-todo-detail-foot' },
                h('button', { type: 'button', className: 'primary', disabled: busy, onClick: () => { void saveDetail() } }, busy ? '保存中…' : '保存'),
                h('button', {
                  type: 'button',
                  className: 'danger',
                  onClick: () => { const current = taskById(detailId); if (current) void remove(current) },
                }, '删除任务')))
          })(),
          creating && createDraft !== null ? h('aside', { className: 'dsh-todo-detail', 'aria-label': '新建待办' },
            h('div', { className: 'dsh-todo-detail-head' },
              h('strong', null, '新建待办'),
              h('button', { type: 'button', 'aria-label': '关闭新建', onClick: closeCreate }, '✕')),
            h('div', { className: 'dsh-todo-detail-body' },
              createError === '' ? null : h('div', { className: 'dsh-todo-error', role: 'alert', style: { margin: 0 } }, createError),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-title' }, '标题'),
                h('input', {
                  id: 'dsh-todo-create-title',
                  value: createDraft.title,
                  autoFocus: true,
                  placeholder: '要做什么',
                  onChange: event => setCreateDraft(current => ({ ...current, title: event.target.value })),
                  onKeyDown: event => {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void saveCreate()
                    if (event.key === 'Escape') closeCreate()
                  },
                })),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-notes' }, '备注'),
                h('textarea', {
                  id: 'dsh-todo-create-notes',
                  value: createDraft.notes,
                  placeholder: '可选',
                  onChange: event => setCreateDraft(current => ({ ...current, notes: event.target.value })),
                })),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-subtasks' }, '子任务'),
                h('textarea', {
                  id: 'dsh-todo-create-subtasks',
                  value: createDraft.subtasks,
                  placeholder: '一行一个，或用逗号分隔',
                  onChange: event => setCreateDraft(current => ({ ...current, subtasks: event.target.value })),
                })),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-list' }, '清单'),
                h('select', {
                  id: 'dsh-todo-create-list',
                  value: createDraft.listId,
                  onChange: event => setCreateDraft(current => ({ ...current, listId: event.target.value })),
                }, lists.map(list => h('option', { key: list.id, value: list.id }, list.name)))),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-priority' }, '优先级'),
                h('select', {
                  id: 'dsh-todo-create-priority',
                  value: createDraft.priority,
                  onChange: event => setCreateDraft(current => ({ ...current, priority: event.target.value })),
                },
                h('option', { value: '0' }, '无'),
                h('option', { value: '1' }, '低'),
                h('option', { value: '2' }, '中'),
                h('option', { value: '3' }, '高'))),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-due' }, '截止'),
                h('div', { className: 'dsh-todo-inline' },
                  h('input', {
                    id: 'dsh-todo-create-due',
                    type: 'datetime-local',
                    value: createDraft.dueLocal,
                    onChange: event => setCreateDraft(current => ({ ...current, dueLocal: event.target.value })),
                  }),
                  h('button', { type: 'button', onClick: () => setCreateDraft(current => ({ ...current, dueLocal: '' })) }, '清除'))),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-repeat' }, '重复'),
                h('select', {
                  id: 'dsh-todo-create-repeat',
                  value: createDraft.repeat,
                  onChange: event => setCreateDraft(current => ({ ...current, repeat: event.target.value })),
                },
                h('option', { value: '' }, '不重复'),
                h('option', { value: 'daily' }, '每天'),
                h('option', { value: 'weekdays' }, '工作日'),
                h('option', { value: 'weekly' }, '每周'),
                h('option', { value: 'monthly' }, '每月'),
                h('option', { value: 'yearly' }, '每年')),
                createDraft.repeat === 'weekly'
                  ? h('div', { className: 'dsh-todo-days', role: 'group', 'aria-label': '每周重复的星期' },
                    [['一', 1], ['二', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['日', 7]].map(([name, day]) => h('button', {
                      key: day,
                      type: 'button',
                      className: 'dsh-todo-day',
                      'aria-pressed': createDraft.weekdays.includes(day) ? 'true' : 'false',
                      'aria-label': `周${name}`,
                      onClick: () => setCreateDraft(current => ({
                        ...current,
                        weekdays: current.weekdays.includes(day)
                          ? current.weekdays.filter(value => value !== day)
                          : [...current.weekdays, day].sort((a, b) => a - b),
                      })),
                    }, name)))
                  : null),
              h('div', { className: 'dsh-todo-field' },
                h('label', { htmlFor: 'dsh-todo-create-tags' }, '标签'),
                h('input', {
                  id: 'dsh-todo-create-tags',
                  value: createDraft.tags,
                  placeholder: '逗号分隔',
                  onChange: event => setCreateDraft(current => ({ ...current, tags: event.target.value })),
                }))),
            h('div', { className: 'dsh-todo-detail-foot' },
              h('button', { type: 'button', className: 'primary', disabled: busy, onClick: () => { void saveCreate() } }, busy ? '创建中…' : '创建'),
              h('button', { type: 'button', className: 'danger', onClick: closeCreate }, '取消')))
          : null
        )
      }

      return {
        inject: ['slots'],
        apply(ctx) {
          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: PANEL_ID,
          }, TodoPage))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 5,
            label: () => '待办',
          }, TodoIcon))
          // The page unmounts whenever a session fills the main column, so the
          // due scan runs at the plugin level instead of inside TodoPage.
          ctx.effect(() => {
            const first = window.setTimeout(() => { void scanDue() }, 1500)
            const timer = window.setInterval(() => { void scanDue() }, 30000)
            const onVisible = () => { if (!document.hidden) void scanDue() }
            document.addEventListener('visibilitychange', onVisible)
            return () => {
              window.clearTimeout(first)
              window.clearInterval(timer)
              document.removeEventListener('visibilitychange', onVisible)
            }
          }, 'dsh-sidebar-todo: due scan')
        },
      }
    },
  })
})()
