window.__ModuleLoader__.load({ id: "@lawyer-dsh/market", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/market-data.ts
		/** One registry entry from /dsh-market/registry. */
		/**
		* Resolve a market API path against the page the UI is served from.
		*
		* Every call used to be root-absolute (`/dsh-market/…`), which the browser
		* resolves against the ORIGIN — so behind a reverse proxy that mounts dsh
		* under a prefix (`https://host/app/my-dsh/`), the panel rendered and then
		* every request in it went to `https://host/dsh-market/…`, missed the prefix
		* rule entirely, and 404'd (#345).
		*
		* Anchored on `document.baseURI`, which is the directory the host serves its
		* UI from. Safe for root deployments because that directory is `/` there, and
		* safe generally because the dsh web UI does not use path routing — measured
		* against a real dsh: `location.pathname` is `/` on the market page, not
		* `/settings/...`, so the directory really is the mount point rather than
		* wherever the user happens to have navigated.
		*/
		function api(path) {
			const relative = path.replace(/^\/+/, "");
			if (typeof document === "undefined") return `/${relative}`;
			return new URL(relative, document.baseURI).pathname;
		}
		//#endregion
		//#region \0dsh-css:src/client/ManagedMarket.module.css.mjs
		const css = "._1FIEtG_root,._1FIEtG_overlay{--mm-surface:var(--dsw-alias-bg-layer-1,#fff);--mm-surface-2:var(--dsw-alias-bg-layer-2,#f7f8fa);--mm-line-1:var(--dsw-alias-border-l1,#eceff3);--mm-line-2:var(--dsw-alias-border-l2,#e5e7eb);--mm-line-3:var(--dsw-alias-border-l3,#d9dde3);--mm-fg:var(--dsw-alias-label-primary,#1f2328);--mm-fg-2:var(--dsw-alias-label-secondary,#6b7280);--mm-fg-3:var(--dsw-alias-label-tertiary,#8b93a1);--mm-brand:var(--dsw-alias-brand-primary,#4f6ef7);--mm-brand-hover:var(--dsw-alias-button-primary-hover,#3f56c9);--mm-on-brand:var(--dsw-alias-label-primary-foreground,#fff);--mm-on-danger:var(--dsw-static-neutral-bluish-00,#fff);--mm-hover:var(--dsw-alias-interactive-bg-hover,#2631480f);--mm-info:var(--dsw-alias-state-business-primary,#4176e6);--mm-info-soft:var(--dsw-alias-state-business-tertiary,#4176e61a);--mm-success:var(--dsw-alias-state-success-primary,#16a34a);--mm-success-soft:var(--dsw-alias-state-success-tertiary,#16a34a1a);--mm-warn:var(--dsw-alias-state-warn-primary,#b45309);--mm-warn-soft:var(--dsw-alias-state-warn-tertiary,#b453091a);--mm-danger:var(--dsw-alias-state-error-primary,#dc2626);--mm-danger-soft:var(--dsw-alias-interactive-bg-hover-danger,#dc262614);--mm-mask:var(--dsw-alias-bg-mask-3,#0f11157a);--mm-shadow-1:var(--dsw-shadow-lv1,0 2px 4px #0000000d);--mm-shadow-2:var(--dsw-shadow-lv2,0 12px 32px #0f111524);--mm-ease:.16s cubic-bezier(.16, 1, .3, 1)}._1FIEtG_root *,._1FIEtG_root :before,._1FIEtG_root :after,._1FIEtG_overlay *,._1FIEtG_overlay :before,._1FIEtG_overlay :after{box-sizing:border-box}._1FIEtG_root{width:100%;max-width:1040px;color:var(--mm-fg);padding:4px 6px 24px;font-size:13px;line-height:1.65;display:block}._1FIEtG_header{border-bottom:1px solid var(--mm-line-1);flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 16px;padding:0 0 12px;display:flex}._1FIEtG_title{color:var(--mm-fg);margin:0;font-size:16px;font-weight:600;line-height:24px}._1FIEtG_subtitle{max-width:640px;color:var(--mm-fg-3);margin:4px 0 0;font-size:12px;line-height:19px}._1FIEtG_headerActions{flex:none;align-items:center;gap:8px;display:flex}._1FIEtG_section{margin:22px 0 0;display:block}._1FIEtG_sectionHead{flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;display:flex}._1FIEtG_sectionTitle{color:var(--mm-fg);margin:0;font-size:13px;font-weight:600;line-height:20px}._1FIEtG_sectionCount{background:var(--mm-surface-2);height:18px;color:var(--mm-fg-2);font-variant-numeric:tabular-nums;border-radius:99px;align-items:center;padding:0 7px;font-size:11px;font-weight:600;line-height:18px;display:inline-flex}._1FIEtG_sectionHint{color:var(--mm-fg-3);margin:0;font-size:11.5px;line-height:18px}._1FIEtG_columns{align-items:flex-start;gap:12px;display:flex}._1FIEtG_column{flex-direction:column;flex:1 1 0;gap:12px;min-width:0;display:flex}._1FIEtG_card{border:1px solid var(--mm-line-2);background:var(--mm-surface);min-width:0;transition:border-color var(--mm-ease), box-shadow var(--mm-ease), background-image var(--mm-ease);border-radius:12px;align-items:flex-start;gap:10px;padding:12px 14px;display:flex}._1FIEtG_card:hover{border-color:var(--mm-line-3);background-image:linear-gradient(var(--mm-hover), var(--mm-hover));box-shadow:var(--mm-shadow-1)}._1FIEtG_mark{background:var(--mm-info-soft);width:26px;height:26px;color:var(--mm-info);border-radius:8px;flex:none;place-items:center;margin-top:1px;font-size:12px;font-weight:600;line-height:1;display:grid}._1FIEtG_cardMain{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}._1FIEtG_cardHead{align-items:center;gap:6px;min-width:0;display:flex}._1FIEtG_name{color:var(--mm-fg);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:13.5px;font-weight:600;line-height:20px;overflow:hidden}._1FIEtG_cardHead ._1FIEtG_badge{margin-left:auto}._1FIEtG_cardHead ._1FIEtG_badge+._1FIEtG_badge{margin-left:0}._1FIEtG_meta{color:var(--mm-fg-3);font-variant-numeric:tabular-nums;margin:0;font-size:11px;line-height:17px}._1FIEtG_description{color:var(--mm-fg-2);overflow-wrap:anywhere;margin:0;font-size:12px;line-height:19px}._1FIEtG_card ._1FIEtG_description{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}._1FIEtG_cardActions{flex:none;align-items:center;gap:8px;display:flex}._1FIEtG_cardActions>button{white-space:nowrap;justify-content:center;min-width:72px}._1FIEtG_toolbar{border-bottom:1px solid var(--mm-line-1);align-items:center;gap:8px;margin:18px 0 4px;display:flex}._1FIEtG_tab,._1FIEtG_tabActive{color:var(--mm-fg-2);font:inherit;cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;align-items:center;gap:6px;margin-bottom:-1px;padding:8px 12px;font-size:13px;font-weight:500;display:inline-flex}._1FIEtG_tab:hover{color:var(--mm-fg)}._1FIEtG_tabActive{color:var(--mm-fg);border-bottom-color:var(--mm-brand)}._1FIEtG_tabCount{background:var(--mm-surface-2);color:var(--mm-fg-3);border-radius:999px;padding:0 6px;font-size:11px;line-height:18px}._1FIEtG_tabBadge{background:color-mix(in srgb, var(--mm-brand) 14%, transparent);color:var(--mm-brand);border-radius:999px;padding:0 6px;font-size:11px;line-height:18px}._1FIEtG_search{flex:200px;justify-content:flex-end;margin-left:auto;padding-bottom:6px;display:flex}._1FIEtG_search input{border:1px solid var(--mm-line-1);background:var(--mm-surface);width:100%;max-width:260px;height:30px;color:var(--mm-fg);border-radius:8px;padding:0 10px;font-size:12px}._1FIEtG_search input:focus{border-color:var(--mm-brand);outline:none}._1FIEtG_badge{background:var(--mm-surface-2);height:20px;color:var(--mm-fg-2);white-space:nowrap;border-radius:6px;align-items:center;padding:0 7px;font-size:11px;font-weight:600;line-height:18px;display:inline-flex}._1FIEtG_cardHead ._1FIEtG_badge,._1FIEtG_restartHead ._1FIEtG_badge{margin-left:auto}._1FIEtG_badgeOwned,._1FIEtG_badge[data-kind=owned]{background:var(--mm-info-soft);color:var(--mm-info)}._1FIEtG_badgeCommunity,._1FIEtG_badge[data-kind=community]{background:var(--mm-surface-2);color:var(--mm-fg-2)}._1FIEtG_badgeInstalled,._1FIEtG_badge[data-kind=installed]{background:var(--mm-success-soft);color:var(--mm-success)}._1FIEtG_badgeUpdate,._1FIEtG_badge[data-kind=update]{background:color-mix(in srgb, var(--mm-brand) 14%, transparent);color:var(--mm-brand)}._1FIEtG_badgeIncompatible{background:var(--mm-warn-soft);color:var(--mm-warn)}._1FIEtG_actionPrimary,._1FIEtG_dialogPrimary{background:var(--mm-brand);min-height:30px;color:var(--mm-on-brand);white-space:nowrap;cursor:pointer;transition:background var(--mm-ease), border-color var(--mm-ease), opacity var(--mm-ease);border:1px solid #0000;border-radius:8px;justify-content:center;align-items:center;padding:0 14px;font-size:12px;font-weight:600;line-height:18px;display:inline-flex}._1FIEtG_actionPrimary:hover:not(:disabled),._1FIEtG_dialogPrimary:hover:not(:disabled){background:var(--mm-brand-hover)}._1FIEtG_actionGhost,._1FIEtG_dialogGhost{border:1px solid var(--mm-line-2);min-height:30px;color:var(--mm-fg-2);white-space:nowrap;cursor:pointer;transition:background var(--mm-ease), border-color var(--mm-ease), color var(--mm-ease), opacity var(--mm-ease);background:0 0;border-radius:8px;justify-content:center;align-items:center;padding:0 12px;font-size:12px;font-weight:500;line-height:18px;display:inline-flex}._1FIEtG_actionGhost:hover:not(:disabled),._1FIEtG_dialogGhost:hover:not(:disabled){background:var(--mm-hover);border-color:var(--mm-line-3);color:var(--mm-fg)}._1FIEtG_dialogDanger{background:var(--mm-danger);min-height:30px;color:var(--mm-on-danger);white-space:nowrap;cursor:pointer;transition:filter var(--mm-ease), opacity var(--mm-ease);border:1px solid #0000;border-radius:8px;justify-content:center;align-items:center;padding:0 14px;font-size:12px;font-weight:600;line-height:18px;display:inline-flex}._1FIEtG_dialogDanger:hover:not(:disabled){filter:brightness(.94)}._1FIEtG_alert{border:1px solid var(--mm-line-1);background:var(--mm-surface-2);color:var(--mm-fg);border-radius:10px;flex-direction:column;gap:6px;margin:12px 0;padding:11px 13px;font-size:12px;line-height:19px;display:flex}._1FIEtG_alertTitle{color:var(--mm-fg);font-size:12.5px;font-weight:600;line-height:19px}._1FIEtG_alertBody{color:var(--mm-fg-2);overflow-wrap:anywhere;margin:0}._1FIEtG_alertHint{color:var(--mm-fg-3);margin:0;font-size:11px;line-height:17px}._1FIEtG_alertActions{flex-wrap:wrap;align-items:center;gap:8px;margin:4px 0 0;display:flex}._1FIEtG_restartHead{flex-wrap:wrap;align-items:center;gap:8px;display:flex}._1FIEtG_alertInfo,._1FIEtG_alert[data-kind=info]{background:var(--mm-info-soft)}._1FIEtG_alertWarning,._1FIEtG_alert[data-kind=warning]{background:var(--mm-warn-soft)}._1FIEtG_alertSuccess,._1FIEtG_alert[data-kind=success]{background:var(--mm-success-soft)}._1FIEtG_alertInfo ._1FIEtG_alertTitle,._1FIEtG_alert[data-kind=info] ._1FIEtG_alertTitle{color:var(--mm-info)}._1FIEtG_alertWarning ._1FIEtG_alertTitle,._1FIEtG_alert[data-kind=warning] ._1FIEtG_alertTitle{color:var(--mm-warn)}._1FIEtG_alertSuccess ._1FIEtG_alertTitle,._1FIEtG_alert[data-kind=success] ._1FIEtG_alertTitle{color:var(--mm-success)}._1FIEtG_alert[data-kind=danger]{background:var(--mm-danger-soft)}._1FIEtG_alert[data-kind=danger] ._1FIEtG_alertTitle,._1FIEtG_alert[data-kind=danger] ._1FIEtG_alertBody{color:var(--mm-danger)}._1FIEtG_progress{border:1px solid var(--mm-line-2);background:var(--mm-surface-2);border-radius:12px;flex-direction:column;gap:10px;margin:12px 0;padding:12px 14px;display:flex}._1FIEtG_progressHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;display:flex}._1FIEtG_progressTitle{color:var(--mm-fg);font-size:12.5px;font-weight:600;line-height:19px}._1FIEtG_progressCount{color:var(--mm-fg-2);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:11px;line-height:18px}._1FIEtG_progressSteps{flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none;display:flex}._1FIEtG_step{min-width:0;color:var(--mm-fg-3);align-items:center;gap:6px;font-size:11.5px;line-height:18px;display:inline-flex}._1FIEtG_stepDot{background:var(--mm-line-3);width:8px;height:8px;transition:background var(--mm-ease), box-shadow var(--mm-ease);border-radius:50%;flex:none}._1FIEtG_stepOn{color:var(--mm-fg);font-weight:600}._1FIEtG_stepOn ._1FIEtG_stepDot{background:var(--mm-brand);box-shadow:0 0 0 3px var(--mm-info-soft)}._1FIEtG_stepDone{color:var(--mm-fg-2)}._1FIEtG_stepDone ._1FIEtG_stepDot{background:var(--mm-success)}._1FIEtG_stepLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._1FIEtG_progressBar{background:var(--mm-line-1);border-radius:99px;height:6px;overflow:hidden}._1FIEtG_progressFill{background:var(--mm-brand);border-radius:99px;height:100%;transition:width .4s cubic-bezier(.16,1,.3,1);display:block}._1FIEtG_progressHint{color:var(--mm-fg-3);margin:0;font-size:11px;line-height:17px}._1FIEtG_emptyCard{border:1px dashed var(--mm-line-2);background:var(--mm-surface-2);text-align:center;border-radius:12px;flex-direction:column;align-items:center;gap:4px;padding:28px 18px;display:flex}._1FIEtG_emptyTitle{color:var(--mm-fg);margin:0;font-size:13px;font-weight:600;line-height:20px}._1FIEtG_emptyHint{max-width:420px;color:var(--mm-fg-3);margin:0;font-size:12px;line-height:19px}._1FIEtG_footer{border-top:1px solid var(--mm-line-1);justify-content:flex-end;align-items:center;gap:8px;margin:18px 0 0;padding:10px 0 0;display:flex}._1FIEtG_footer ._1FIEtG_muted{margin:0}._1FIEtG_muted{color:var(--mm-fg-3);margin:0 0 10px;font-size:11.5px;line-height:18px}._1FIEtG_overlay{z-index:10000;background:var(--mm-mask);-webkit-backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:16px;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}._1FIEtG_dialog{border:1px solid var(--mm-line-2);background:var(--mm-surface);width:100%;max-width:460px;max-height:calc(100vh - 32px);box-shadow:var(--mm-shadow-2);border-radius:14px;flex-direction:column;padding:20px;display:flex;overflow-y:auto}._1FIEtG_dialogTitle{color:var(--mm-fg);margin:0 0 12px;font-size:15px;font-weight:600;line-height:22px}._1FIEtG_dialogBody{flex-direction:column;gap:10px;min-width:0;display:flex}._1FIEtG_dialogMeta{border:1px solid var(--mm-line-1);background:var(--mm-surface-2);border-radius:10px;flex-direction:column;padding:2px 12px;display:flex}._1FIEtG_dialogMetaRow{border-top:1px solid var(--mm-line-1);align-items:baseline;gap:12px;padding:6px 0;display:flex}._1FIEtG_dialogMetaRow:first-child{border-top:0}._1FIEtG_dialogMetaLabel{color:var(--mm-fg-3);flex:0 0 56px;font-size:11.5px;line-height:18px}._1FIEtG_dialogMetaValue{min-width:0;color:var(--mm-fg);overflow-wrap:anywhere;flex:1;font-size:12px;font-weight:500;line-height:18px}._1FIEtG_dialogNote{color:var(--mm-fg-3);margin:0;font-size:11.5px;line-height:18px}._1FIEtG_dialogActions{justify-content:flex-end;align-items:center;gap:8px;margin:16px 0 0;display:flex}._1FIEtG_form{flex-wrap:wrap;align-items:flex-end;gap:10px;margin:14px 0 0;display:flex}._1FIEtG_label{min-width:0;color:var(--mm-fg-2);flex-direction:column;flex:240px;gap:6px;font-size:12px;line-height:18px;display:flex}._1FIEtG_footnote{color:var(--mm-fg-2);margin:8px 0 0;font-size:12px;line-height:19px}._1FIEtG_locked{border-left:2px solid var(--mm-line-2);color:var(--mm-fg-3);align-items:center;gap:8px;margin:8px 0 0;padding-left:9px;font-size:11.5px;line-height:18px;display:flex}._1FIEtG_root a{color:var(--dsw-alias-link,#4f6ef7);text-decoration:none}._1FIEtG_root a:hover{text-decoration:underline}._1FIEtG_root input,._1FIEtG_root select{border:1px solid var(--mm-line-2);background:var(--mm-surface);width:100%;min-width:0;color:var(--mm-fg);font:inherit;transition:border-color var(--mm-ease), box-shadow var(--mm-ease);border-radius:8px;padding:7px 10px;font-size:12px;line-height:18px}._1FIEtG_root option{color:var(--mm-fg);background:var(--mm-surface)}._1FIEtG_root input:focus,._1FIEtG_root select:focus{border-color:var(--mm-info);box-shadow:0 0 0 3px var(--mm-info-soft)}._1FIEtG_root input:disabled,._1FIEtG_root select:disabled{opacity:.6;cursor:not-allowed;background:var(--mm-surface-2)}._1FIEtG_root button:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_root a:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_root input:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_root select:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_overlay button:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_overlay a:focus-visible{outline:2px solid var(--mm-brand);outline-offset:2px}._1FIEtG_root button:disabled,._1FIEtG_overlay button:disabled{opacity:.5;cursor:not-allowed}@media (prefers-color-scheme:dark){._1FIEtG_root,._1FIEtG_overlay{--mm-surface:var(--dsw-alias-bg-layer-1,#1b2027);--mm-surface-2:var(--dsw-alias-bg-layer-2,#232830);--mm-line-1:var(--dsw-alias-border-l1,#ffffff12);--mm-line-2:var(--dsw-alias-border-l2,#ffffff24);--mm-line-3:var(--dsw-alias-border-l3,#fff3);--mm-fg:var(--dsw-alias-label-primary,#e9ebef);--mm-fg-2:var(--dsw-alias-label-secondary,#a8b0bd);--mm-fg-3:var(--dsw-alias-label-tertiary,#8b93a1);--mm-brand:var(--dsw-alias-brand-primary,#e9ebef);--mm-brand-hover:var(--dsw-alias-button-primary-hover,#fff);--mm-on-brand:var(--dsw-alias-label-primary-foreground,#14171d);--mm-hover:var(--dsw-alias-interactive-bg-hover,#ffffff14);--mm-info:var(--dsw-alias-state-business-primary,#679efe);--mm-info-soft:var(--dsw-alias-state-business-tertiary,#679efe29);--mm-success:var(--dsw-alias-state-success-primary,#4ade80);--mm-success-soft:var(--dsw-alias-state-success-tertiary,#4ade8029);--mm-warn:var(--dsw-alias-state-warn-primary,#fbbf24);--mm-warn-soft:var(--dsw-alias-state-warn-tertiary,#fbbf2429);--mm-danger:var(--dsw-alias-state-error-primary,#f26a6a);--mm-danger-soft:var(--dsw-alias-interactive-bg-hover-danger,#f25a5a29);--mm-mask:var(--dsw-alias-bg-mask-3,#0009);--mm-shadow-1:var(--dsw-shadow-lv1,0 2px 6px #0006);--mm-shadow-2:var(--dsw-shadow-lv2,0 12px 32px #00000080)}}@media (prefers-reduced-motion:reduce){._1FIEtG_card,._1FIEtG_actionPrimary,._1FIEtG_actionGhost,._1FIEtG_dialogPrimary,._1FIEtG_dialogGhost,._1FIEtG_dialogDanger,._1FIEtG_stepDot,._1FIEtG_progressFill,._1FIEtG_root input,._1FIEtG_root select{transition:none}._1FIEtG_card:hover{transform:none}}@media (max-width:560px){._1FIEtG_header{flex-direction:column;align-items:stretch}._1FIEtG_headerActions>button{width:100%}._1FIEtG_columns{flex-direction:column}._1FIEtG_card{flex-wrap:wrap}._1FIEtG_cardActions{justify-content:flex-end;width:100%}._1FIEtG_cardActions>button,._1FIEtG_form>button,._1FIEtG_dialogActions>button{width:100%}._1FIEtG_dialogActions{flex-direction:column;align-items:stretch}._1FIEtG_progressSteps{flex-direction:column;gap:6px}._1FIEtG_overlay{padding:12px}._1FIEtG_dialog{max-width:none;max-height:calc(100vh - 24px)}}._1FIEtG_visionGroup{border:1px solid var(--mm-line-1);background:var(--mm-surface-2);border-radius:10px;flex-direction:column;gap:8px;margin:16px 0 0;padding:12px 14px;display:flex}._1FIEtG_visionLegend{color:var(--mm-fg-2);align-items:baseline;gap:8px;padding:0 4px;font-size:12px;font-weight:600;display:flex}._1FIEtG_visionCount{color:var(--mm-fg-3);font-weight:400}._1FIEtG_visionHint{color:var(--mm-fg-3);margin:0;font-size:12px;line-height:18px}._1FIEtG_visionRows{flex-direction:column;gap:2px;display:flex}._1FIEtG_visionRow{color:var(--mm-fg);border-radius:8px;align-items:center;gap:12px;padding:6px 8px;font-size:13px;line-height:20px;display:flex}._1FIEtG_visionRow:hover{background:var(--mm-hover)}._1FIEtG_visionCheck{cursor:pointer;flex:auto;align-items:center;gap:8px;min-width:0;display:flex}._1FIEtG_visionRow input[type=checkbox]{width:15px;height:15px;accent-color:var(--mm-brand);cursor:pointer;margin:0}._1FIEtG_contextField{color:var(--mm-fg-3);flex:none;align-items:center;gap:6px;font-size:12px;display:flex}._1FIEtG_contextLabel{white-space:nowrap}._1FIEtG_contextInput{border:1px solid var(--mm-line-1);background:var(--mm-surface-1);width:104px;color:var(--mm-fg);font:inherit;font-variant-numeric:tabular-nums;text-align:right;border-radius:6px;padding:4px 8px}._1FIEtG_contextInput:disabled{opacity:.6}._1FIEtG_contextUnit{white-space:nowrap}._1FIEtG_visionName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}._1FIEtG_visionState{color:var(--mm-fg-3);flex:none;font-size:12px}._1FIEtG_visionActions{justify-content:flex-end;margin-top:2px;display:flex}._1FIEtG_visionActions button{min-width:132px}@media (max-width:720px){._1FIEtG_visionRow{flex-wrap:wrap}._1FIEtG_visionActions button{width:100%}}";
		const tagId = "@lawyer-dsh/market/ManagedMarket.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@lawyer-dsh/market";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ManagedMarket_module_css_default = {
			"actionGhost": "_1FIEtG_actionGhost",
			"actionPrimary": "_1FIEtG_actionPrimary",
			"alert": "_1FIEtG_alert",
			"alertActions": "_1FIEtG_alertActions",
			"alertBody": "_1FIEtG_alertBody",
			"alertHint": "_1FIEtG_alertHint",
			"alertInfo": "_1FIEtG_alertInfo",
			"alertSuccess": "_1FIEtG_alertSuccess",
			"alertTitle": "_1FIEtG_alertTitle",
			"alertWarning": "_1FIEtG_alertWarning",
			"badge": "_1FIEtG_badge",
			"badgeCommunity": "_1FIEtG_badgeCommunity",
			"badgeIncompatible": "_1FIEtG_badgeIncompatible",
			"badgeInstalled": "_1FIEtG_badgeInstalled",
			"badgeOwned": "_1FIEtG_badgeOwned",
			"badgeUpdate": "_1FIEtG_badgeUpdate",
			"card": "_1FIEtG_card",
			"cardActions": "_1FIEtG_cardActions",
			"cardHead": "_1FIEtG_cardHead",
			"cardMain": "_1FIEtG_cardMain",
			"column": "_1FIEtG_column",
			"columns": "_1FIEtG_columns",
			"contextField": "_1FIEtG_contextField",
			"contextInput": "_1FIEtG_contextInput",
			"contextLabel": "_1FIEtG_contextLabel",
			"contextUnit": "_1FIEtG_contextUnit",
			"description": "_1FIEtG_description",
			"dialog": "_1FIEtG_dialog",
			"dialogActions": "_1FIEtG_dialogActions",
			"dialogBody": "_1FIEtG_dialogBody",
			"dialogDanger": "_1FIEtG_dialogDanger",
			"dialogGhost": "_1FIEtG_dialogGhost",
			"dialogMeta": "_1FIEtG_dialogMeta",
			"dialogMetaLabel": "_1FIEtG_dialogMetaLabel",
			"dialogMetaRow": "_1FIEtG_dialogMetaRow",
			"dialogMetaValue": "_1FIEtG_dialogMetaValue",
			"dialogNote": "_1FIEtG_dialogNote",
			"dialogPrimary": "_1FIEtG_dialogPrimary",
			"dialogTitle": "_1FIEtG_dialogTitle",
			"emptyCard": "_1FIEtG_emptyCard",
			"emptyHint": "_1FIEtG_emptyHint",
			"emptyTitle": "_1FIEtG_emptyTitle",
			"footer": "_1FIEtG_footer",
			"footnote": "_1FIEtG_footnote",
			"form": "_1FIEtG_form",
			"header": "_1FIEtG_header",
			"headerActions": "_1FIEtG_headerActions",
			"label": "_1FIEtG_label",
			"locked": "_1FIEtG_locked",
			"mark": "_1FIEtG_mark",
			"meta": "_1FIEtG_meta",
			"muted": "_1FIEtG_muted",
			"name": "_1FIEtG_name",
			"overlay": "_1FIEtG_overlay",
			"progress": "_1FIEtG_progress",
			"progressBar": "_1FIEtG_progressBar",
			"progressCount": "_1FIEtG_progressCount",
			"progressFill": "_1FIEtG_progressFill",
			"progressHead": "_1FIEtG_progressHead",
			"progressHint": "_1FIEtG_progressHint",
			"progressSteps": "_1FIEtG_progressSteps",
			"progressTitle": "_1FIEtG_progressTitle",
			"restartHead": "_1FIEtG_restartHead",
			"root": "_1FIEtG_root",
			"search": "_1FIEtG_search",
			"section": "_1FIEtG_section",
			"sectionCount": "_1FIEtG_sectionCount",
			"sectionHead": "_1FIEtG_sectionHead",
			"sectionHint": "_1FIEtG_sectionHint",
			"sectionTitle": "_1FIEtG_sectionTitle",
			"step": "_1FIEtG_step",
			"stepDone": "_1FIEtG_stepDone",
			"stepDot": "_1FIEtG_stepDot",
			"stepLabel": "_1FIEtG_stepLabel",
			"stepOn": "_1FIEtG_stepOn",
			"subtitle": "_1FIEtG_subtitle",
			"tab": "_1FIEtG_tab",
			"tabActive": "_1FIEtG_tabActive",
			"tabBadge": "_1FIEtG_tabBadge",
			"tabCount": "_1FIEtG_tabCount",
			"title": "_1FIEtG_title",
			"toolbar": "_1FIEtG_toolbar",
			"visionActions": "_1FIEtG_visionActions",
			"visionCheck": "_1FIEtG_visionCheck",
			"visionCount": "_1FIEtG_visionCount",
			"visionGroup": "_1FIEtG_visionGroup",
			"visionHint": "_1FIEtG_visionHint",
			"visionLegend": "_1FIEtG_visionLegend",
			"visionName": "_1FIEtG_visionName",
			"visionRow": "_1FIEtG_visionRow",
			"visionRows": "_1FIEtG_visionRows",
			"visionState": "_1FIEtG_visionState"
		};
		//#endregion
		//#region src/client/ManagedMarket.tsx
		const managedZh = {
			market: "律师能力",
			models: "模型服务",
			loading: "正在加载…",
			retry: "刷新目录",
			empty: "平台尚未开放可安装的能力",
			installed: "已安装",
			available: "可安装能力",
			install: "安装",
			update: "更新",
			remove: "卸载",
			incompatible: "暂不兼容当前版本",
			managed: "仅显示平台审核并允许安装的能力。插件来源与版本由平台统一管理。",
			confirm: "确认执行此插件操作？正在进行的办案任务需要先结束。",
			restart: "变更已通过启动检查。请关闭并重新启动工作台后使用新能力；重启前不能继续修改插件。",
			failed: "操作未完成",
			revision: "目录版本",
			fixed: "模型服务由平台统一提供，不支持添加其他模型站。",
			account: "账户与充值",
			key: "本站 API 令牌",
			save: "保存令牌",
			saved: "令牌已保存，可刷新可用模型。",
			refresh: "刷新可用模型",
			select: "默认模型",
			choose: "保存默认模型",
			configured: "已配置本站令牌",
			missing: "尚未配置本站令牌",
			readonly: "令牌由启动环境提供，请在启动环境中更新。",
			savedModel: "默认模型已更新，新对话生效。",
			progress: "正在校验并准备插件环境，请稍候…",
			selected: "当前默认模型",
			errorTitle: "暂时无法读取平台目录",
			noFallback: "不会切换到公共社区目录，请稍后重试。",
			site: "我们的模型站",
			installedVersion: "已装版本",
			updateTo: "可更新至",
			none: "暂无模型，请先配置本站令牌并刷新。",
			pending: "等待重启",
			checking: "正在检查新环境",
			authorizing: "正在核验平台许可",
			preparing: "正在安装到隔离环境",
			idle: "就绪",
			savedOk: "保存成功",
			owned: "平台审核",
			community: "社区",
			confirmTitleInstall: "确认安装这个能力？",
			confirmTitleUpdate: "确认更新这个能力？",
			confirmTitleUninstall: "确认卸载这个能力？",
			confirmRunInstall: "确认安装",
			confirmRunUpdate: "确认更新",
			confirmRunUninstall: "确认卸载",
			cancel: "取消",
			confirmNote: "安装会改动工作台环境；正在进行的办案任务请先结束，安装完成后需要重启才能使用新能力。",
			confirmNoteUninstall: "卸载后该能力立即从工作台移除；邮箱、案件等业务数据不会被删除，重新安装即可恢复使用。",
			dialogMetaName: "能力",
			dialogMetaVersion: "版本",
			dialogMetaCategory: "分类",
			dialogMetaSource: "来源",
			dialogMetaState: "当前状态",
			stateNotInstalled: "未安装",
			stateInstalled: "已安装",
			stateUpdatable: "可更新",
			stageChecking: "校验环境",
			stageAuthorizing: "核验授权",
			stagePreparing: "安装到隔离环境",
			progressOf: "步骤",
			progressWait: "同一时间只允许一个安装操作；完成前不能再次操作。",
			restartTitle: "安装已完成，重启后生效",
			restartBody: "环境检查已通过。新能力需要重启工作台才会加载；重启前不能继续安装或卸载。",
			restartNow: "立即重启",
			restarting: "正在重启…",
			restartWaiting: "工作台正在重启，请稍候…",
			restartDone: "已重启，正在刷新页面…",
			restartTimeout: "等待重启超时：如果窗口已关闭，请手动重新打开工作台。",
			restartUnavailable: "当前形态不支持一键重启，请手动关闭并重新打开工作台。",
			restartSuccessToast: "已重启，新能力已生效。",
			uninstallAvailableHint: "重启前仍可卸载已安装能力。",
			emptyInstalledTitle: "还没有安装任何能力",
			emptyInstalledHint: "从下面的列表里选择能力安装，安装完成重启工作台即可使用。",
			retryAction: "重试",
			refreshing: "正在刷新…",
			search: "搜索能力",
			searchPlaceholder: "搜索能力名称、分类或说明",
			searchEmpty: "没有匹配的能力，换个词试试。",
			visionTitle: "模型能力",
			visionHint: "勾选「支持图片」表示这个模型能直接看图。没勾的模型发图片会被拦下（当前模型不支持图片）。",
			visionField: "支持图片",
			visionOn: "可看图",
			visionOff: "仅文字",
			visionDefault: "默认",
			contextField: "上下文窗口",
			contextUnit: "tokens",
			contextHint: "填这个模型一次能读多少 token；留空表示用默认值。",
			contextInvalid: "上下文窗口要填正整数（单位 token），或留空用默认值。",
			saveModels: "保存模型设置",
			savedModels: "模型设置已保存，新对话生效。",
			modelCount: "本站已开放",
			modelSelected: "当前默认"
		};
		const managedEn = {
			market: "Legal capabilities",
			models: "Model service",
			loading: "Loading…",
			retry: "Refresh catalog",
			empty: "No capabilities are currently approved",
			installed: "Installed",
			available: "Available capabilities",
			install: "Install",
			update: "Update",
			remove: "Uninstall",
			incompatible: "Not compatible with this version",
			managed: "Only centrally reviewed and approved capabilities are listed. The platform manages sources and versions.",
			confirm: "Confirm this plugin operation? Finish active tasks first.",
			restart: "The new environment passed its startup check. Close and restart the workbench to use the changes. Further plugin changes are blocked until restart.",
			failed: "Operation did not complete",
			revision: "Catalog revision",
			fixed: "This product uses our model service only. Other model endpoints cannot be added.",
			account: "Account and billing",
			key: "Platform API token",
			save: "Save token",
			saved: "Token saved. Refresh available models.",
			refresh: "Refresh models",
			select: "Default model",
			choose: "Save default",
			configured: "Platform token configured",
			missing: "Platform token not configured",
			readonly: "The launching environment owns this credential. Update it there.",
			savedModel: "Default saved for new conversations.",
			progress: "Validating and preparing the plugin environment…",
			selected: "Current default",
			errorTitle: "Platform catalog unavailable",
			noFallback: "No public community fallback is used. Retry later.",
			site: "Our model service",
			installedVersion: "Installed version",
			updateTo: "Update to",
			none: "No models. Configure your platform token and refresh.",
			pending: "Restart required",
			checking: "Checking the new environment",
			authorizing: "Checking platform approval",
			preparing: "Preparing an isolated environment",
			idle: "Ready",
			savedOk: "Saved",
			owned: "Reviewed",
			community: "Community",
			confirmTitleInstall: "Install this capability?",
			confirmTitleUpdate: "Update this capability?",
			confirmTitleUninstall: "Uninstall this capability?",
			confirmRunInstall: "Install",
			confirmRunUpdate: "Update",
			confirmRunUninstall: "Uninstall",
			cancel: "Cancel",
			confirmNote: "Installing changes the workbench environment. Finish active case work first; a restart is required before the new capability becomes available.",
			confirmNoteUninstall: "The capability is removed from the workbench immediately. Case and mailbox data are not deleted, and reinstalling restores it.",
			dialogMetaName: "Capability",
			dialogMetaVersion: "Version",
			dialogMetaCategory: "Category",
			dialogMetaSource: "Source",
			dialogMetaState: "State",
			stateNotInstalled: "Not installed",
			stateInstalled: "Installed",
			stateUpdatable: "Update available",
			stageChecking: "Checking the environment",
			stageAuthorizing: "Verifying approval",
			stagePreparing: "Preparing the isolated environment",
			progressOf: "Step",
			progressWait: "Only one operation runs at a time; further changes wait until it finishes.",
			restartTitle: "Installed — restart to activate",
			restartBody: "The environment check passed. New capabilities load after a workbench restart; installing or uninstalling is blocked until then.",
			restartNow: "Restart now",
			restarting: "Restarting…",
			restartWaiting: "The workbench is restarting, please wait…",
			restartDone: "Restarted — reloading the page…",
			restartTimeout: "Restart timed out: if the window closed, reopen the workbench manually.",
			restartUnavailable: "This build cannot restart itself. Close and reopen the workbench manually.",
			restartSuccessToast: "Restarted — new capabilities are active.",
			uninstallAvailableHint: "Installed capabilities can still be uninstalled before the restart.",
			emptyInstalledTitle: "Nothing installed yet",
			emptyInstalledHint: "Pick a capability below. After it installs, restart the workbench to use it.",
			retryAction: "Retry",
			refreshing: "Refreshing…",
			search: "Search capabilities",
			searchPlaceholder: "Search by name, category or description",
			searchEmpty: "No capability matches. Try another keyword.",
			visionTitle: "Model capabilities",
			visionHint: "“Supports images” means this model can see pictures directly. Sending an image to an unchecked model is refused (the current model does not support images).",
			visionField: "Supports images",
			visionOn: "Vision",
			visionOff: "Text only",
			visionDefault: "Default",
			contextField: "Context window",
			contextUnit: "tokens",
			contextHint: "How many tokens this model can read at once. Leave empty to use the default.",
			contextInvalid: "The context window must be a positive whole number of tokens, or empty for the default.",
			saveModels: "Save model settings",
			savedModels: "Model settings saved for new conversations.",
			modelCount: "Offered by the site",
			modelSelected: "Current default"
		};
		async function request(path, body) {
			const response = await fetch(api(`dsh-market/${path}`), {
				method: body === void 0 ? "GET" : "POST",
				credentials: "same-origin",
				headers: {
					"content-type": "application/json",
					"x-lawyer-market": "1"
				},
				...body === void 0 ? {} : { body: JSON.stringify(body) }
			});
			const value = await response.json();
			if (!response.ok) throw new Error(value.error ?? "Request failed");
			return value;
		}
		/** The host's install stages, in order. Anything unknown counts as preparation. */
		const STAGES = [
			"checking",
			"authorizing",
			"preparing"
		];
		const STAGE_LABEL = {
			checking: "stageChecking",
			authorizing: "stageAuthorizing",
			preparing: "stagePreparing"
		};
		function stageIndex(stage) {
			const index = STAGES.indexOf(stage);
			return index < 0 ? STAGES.length - 1 : index;
		}
		/**
		* Poll `status` until the restart lands.
		*
		* Why this shape: the page lives inside the process being restarted, so a
		* successful restart looks like "no answer for a while, then answers again".
		* We therefore require a stretch of consecutive failures (proof the old
		* process died) before treating the first later success as the new process.
		*/
		async function waitForWorkbenchRestart(options) {
			const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
			const reload = options.reload ?? (() => {
				window.location.reload();
			});
			const attempts = options.attempts ?? 90;
			const pollMs = options.pollMs ?? 1e3;
			let sawDowntime = false;
			for (let attempt = 0; attempt < attempts; attempt++) {
				await sleep(pollMs);
				try {
					const status = await options.load();
					if (!sawDowntime) continue;
					if (status.busy) continue;
					reload();
					return "restarted";
				} catch {
					sawDowntime = true;
				}
			}
			return "timeout";
		}
		/** The step rail + bar shown while an operation runs. */
		function OperationProgress({ t, stage }) {
			const current = stageIndex(stage);
			const total = STAGES.length;
			const label = (index) => t(STAGE_LABEL[STAGES[index] ?? "preparing"]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ManagedMarket_module_css_default.progress,
				role: "status",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ManagedMarket_module_css_default.progressHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ManagedMarket_module_css_default.progressTitle,
							children: t("progress")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ManagedMarket_module_css_default.progressCount,
							children: `${t("progressOf")} ${Math.min(current + 1, total)}/${total}`
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: ManagedMarket_module_css_default.progressSteps,
						children: STAGES.map((_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: `${ManagedMarket_module_css_default.step} ${index === current ? ManagedMarket_module_css_default.stepOn : ""} ${index < current ? ManagedMarket_module_css_default.stepDone : ""}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ManagedMarket_module_css_default.stepDot,
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ManagedMarket_module_css_default.stepLabel,
								children: label(index)
							})]
						}, index))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.progressBar,
						role: "progressbar",
						"aria-valuemin": 1,
						"aria-valuemax": total,
						"aria-valuenow": Math.min(current + 1, total),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ManagedMarket_module_css_default.progressFill,
							style: { width: `${Math.round((current + 1) / total * 100)}%` }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.progressHint,
						children: t("progressWait")
					})
				]
			});
		}
		/** Confirmation dialog replacing window.confirm: shows what will change, then asks. */
		function ConfirmDialog({ t, pending, busy, onCancel, onConfirm }) {
			const title = pending.path === "uninstall" ? t("confirmTitleUninstall") : pending.path === "update" ? t("confirmTitleUpdate") : t("confirmTitleInstall");
			const run = pending.path === "uninstall" ? t("confirmRunUninstall") : pending.path === "update" ? t("confirmRunUpdate") : t("confirmRunInstall");
			const state = pending.path === "uninstall" ? t("stateInstalled") : pending.path === "update" ? t("stateUpdatable") : t("stateNotInstalled");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ManagedMarket_module_css_default.overlay,
				role: "presentation",
				onClick: busy ? void 0 : onCancel,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ManagedMarket_module_css_default.dialog,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": title,
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: ManagedMarket_module_css_default.dialogTitle,
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ManagedMarket_module_css_default.dialogBody,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ManagedMarket_module_css_default.dialogMeta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ManagedMarket_module_css_default.dialogMetaRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaLabel,
												children: t("dialogMetaName")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaValue,
												children: pending.name
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ManagedMarket_module_css_default.dialogMetaRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaLabel,
												children: t("dialogMetaVersion")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: ManagedMarket_module_css_default.dialogMetaValue,
												children: [
													"v",
													pending.version,
													pending.from === "" ? "" : ` ← v${pending.from}`
												]
											})]
										}),
										pending.category === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ManagedMarket_module_css_default.dialogMetaRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaLabel,
												children: t("dialogMetaCategory")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaValue,
												children: pending.category
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ManagedMarket_module_css_default.dialogMetaRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaLabel,
												children: t("dialogMetaSource")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaValue,
												children: pending.source === "community" ? t("community") : t("owned")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: ManagedMarket_module_css_default.dialogMetaRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaLabel,
												children: t("dialogMetaState")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.dialogMetaValue,
												children: state
											})]
										})
									]
								}),
								pending.description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: ManagedMarket_module_css_default.description,
									children: pending.description
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: ManagedMarket_module_css_default.dialogNote,
									children: pending.path === "uninstall" ? t("confirmNoteUninstall") : t("confirmNote")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ManagedMarket_module_css_default.dialogActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ManagedMarket_module_css_default.dialogGhost,
								onClick: onCancel,
								disabled: busy,
								children: t("cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								autoFocus: true,
								className: pending.path === "uninstall" ? ManagedMarket_module_css_default.dialogDanger : ManagedMarket_module_css_default.dialogPrimary,
								onClick: onConfirm,
								disabled: busy,
								children: run
							})]
						})
					]
				})
			});
		}
		/** Restart banner: the only path from "installed" to "usable", so it carries a button. */
		function RestartBanner({ t, phase, onRestart }) {
			const message = phase === "restarting" ? t("restartWaiting") : phase === "done" ? t("restartDone") : phase === "timeout" ? t("restartTimeout") : phase === "unavailable" ? t("restartUnavailable") : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ManagedMarket_module_css_default.alert,
				"data-kind": "warning",
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ManagedMarket_module_css_default.restartHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							className: ManagedMarket_module_css_default.alertTitle,
							children: t("restartTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ManagedMarket_module_css_default.badge,
							"data-kind": "installed",
							children: t("pending")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.alertBody,
						children: t("restartBody")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.alertHint,
						children: t("uninstallAvailableHint")
					}),
					message === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.alertHint,
						"aria-live": "polite",
						children: message
					}),
					phase === "idle" || phase === "timeout" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.alertActions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ManagedMarket_module_css_default.actionPrimary,
							onClick: onRestart,
							children: t("restartNow")
						})
					}) : null
				]
			});
		}
		/**
		* Card columns that follow the container, not the viewport.
		*
		* The same section renders in a ~600px settings dialog (desktop) and a wide
		* Web workbench, so a viewport media query would give the narrow dialog two
		* cramped columns. Cards are dealt alternately into the columns to keep the
		* left-to-right reading order the catalog is sorted in.
		*/
		function useCardColumns() {
			const ref = (0, react.useRef)(null);
			const [count, setCount] = (0, react.useState)(1);
			(0, react.useEffect)(() => {
				const element = ref.current;
				if (element === null || typeof ResizeObserver === "undefined") return;
				const measure = (width) => setCount(width >= 640 ? 2 : 1);
				measure(element.clientWidth);
				const observer = new ResizeObserver((entries) => measure(entries[0]?.contentRect.width ?? element.clientWidth));
				observer.observe(element);
				return () => observer.disconnect();
			}, []);
			return {
				ref,
				count
			};
		}
		/** Lay cards out in one or two balanced columns. */
		function CardColumns({ count, children }) {
			const items = react.Children.toArray(children);
			const buckets = Array.from({ length: Math.max(1, count) }, () => []);
			items.forEach((child, index) => buckets[index % buckets.length].push(child));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ManagedMarket_module_css_default.columns,
				children: buckets.map((bucket, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ManagedMarket_module_css_default.column,
					children: bucket
				}, index))
			});
		}
		/**
		* One capability card: category mark, name, meta line, clamped description,
		* and the action pinned to the top-right — the same reading order as the
		* market's own cards, so the two surfaces do not feel like different products.
		*/
		function CapabilityCard({ category, name, meta, description, badges, action }) {
			const mark = category.trim() === "" ? name.trim().slice(0, 1) : category.trim().slice(0, 1);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: ManagedMarket_module_css_default.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ManagedMarket_module_css_default.mark,
						"aria-hidden": "true",
						children: mark
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ManagedMarket_module_css_default.cardMain,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ManagedMarket_module_css_default.cardHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									className: ManagedMarket_module_css_default.name,
									children: name
								}), badges]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.meta,
								children: meta
							}),
							description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.description,
								children: description
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.cardActions,
						children: action
					})
				]
			});
		}
		function ManagedMarketSection({ t }) {
			const [catalog, setCatalog] = (0, react.useState)(null), [installed, setInstalled] = (0, react.useState)([]);
			const [status, setStatus] = (0, react.useState)({
				busy: false,
				stage: "idle",
				restartRequired: false
			});
			const [error, setError] = (0, react.useState)(""), [operationError, setOperationError] = (0, react.useState)(""), [busy, setBusy] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [pending, setPending] = (0, react.useState)(null);
			const [restartPhase, setRestartPhase] = (0, react.useState)("idle");
			const [tab, setTab] = (0, react.useState)("installed");
			/** 只在首次加载时定默认页：什么都没装的人该直接看到可装的东西，
			*  已经装过的人该先看到自己装了什么。用户点过 tab 之后就不再自动切。 */
			const tabPinned = (0, react.useRef)(false);
			const [query, setQuery] = (0, react.useState)("");
			const layout = useCardColumns();
			const [toast, setToast] = (0, react.useState)("");
			/** Guards the polling effect so a re-render never starts a second restart. */
			const restartingRef = (0, react.useRef)(false);
			const load = async () => {
				setError("");
				const current = await request("installed");
				setInstalled(current.installed);
				setStatus(current);
				if (!tabPinned.current && current.installed.length === 0) setTab("available");
				try {
					setCatalog(await request("registry"));
				} catch (e) {
					setCatalog(null);
					setError(String(e instanceof Error ? e.message : e));
				}
			};
			(0, react.useEffect)(() => {
				setToast(sessionStorage.getItem("dshm-managed-toast") ?? "");
				sessionStorage.removeItem("dshm-managed-toast");
				load().catch((e) => setError(String(e)));
			}, []);
			(0, react.useEffect)(() => {
				if (!busy) return;
				const timer = setInterval(() => {
					request("status").then(setStatus).catch(() => void 0);
				}, 700);
				return () => clearInterval(timer);
			}, [busy]);
			const run = async () => {
				const operation = pending;
				if (operation === null) return;
				setPending(null);
				setBusy(true);
				setOperationError("");
				try {
					await request(operation.path, {
						id: operation.id,
						version: operation.version
					});
					await load();
					if (operation.path !== "uninstall") sessionStorage.setItem("dshm-managed-pending-restart", "1");
				} catch (e) {
					setOperationError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			};
			const startRestart = async () => {
				if (restartingRef.current) return;
				restartingRef.current = true;
				setRestartPhase("restarting");
				try {
					await request("restart", {});
				} catch (e) {
					restartingRef.current = false;
					setRestartPhase("unavailable");
					const reason = e instanceof Error ? e.message : String(e);
					setOperationError(reason === t("restartUnavailable") ? "" : reason);
					return;
				}
				const outcome = await waitForWorkbenchRestart({ load: () => request("status") });
				restartingRef.current = false;
				if (outcome === "timeout") {
					setRestartPhase("timeout");
					return;
				}
				sessionStorage.setItem("dshm-managed-toast", t("restartSuccessToast"));
				setRestartPhase("done");
			};
			const refresh = async () => {
				setRefreshing(true);
				try {
					await load();
				} catch (e) {
					setError(String(e instanceof Error ? e.message : e));
				} finally {
					setRefreshing(false);
				}
			};
			const askInstall = (item, current) => setPending({
				path: current === void 0 ? "install" : "update",
				id: item.id,
				name: item.name,
				version: item.version,
				description: item.description,
				category: item.category,
				source: item.source,
				from: current?.version ?? ""
			});
			const askUninstall = (item) => setPending({
				path: "uninstall",
				id: item.id,
				name: catalog?.plugins.find((p) => p.id === item.id)?.name ?? item.id,
				version: item.version,
				description: "",
				category: "",
				source: "owned",
				from: item.version
			});
			const locked = busy || status.restartRequired;
			const keyword = query.trim().toLowerCase();
			const match = (fields) => keyword === "" || fields.some((field) => String(field ?? "").toLowerCase().includes(keyword));
			const installedRows = installed.filter((item) => match([
				item.id,
				catalog?.plugins.find((p) => p.id === item.id)?.name,
				catalog?.plugins.find((p) => p.id === item.id)?.category,
				catalog?.plugins.find((p) => p.id === item.id)?.description
			]));
			const availableRows = (catalog?.plugins ?? []).filter((item) => match([
				item.id,
				item.name,
				item.category,
				item.description
			]));
			const updatableCount = installed.filter((item) => catalog?.plugins.find((p) => p.id === item.id)?.version !== void 0 && catalog.plugins.find((p) => p.id === item.id)?.version !== item.version).length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: ManagedMarket_module_css_default.root,
				"aria-label": t("market"),
				ref: layout.ref,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: ManagedMarket_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: ManagedMarket_module_css_default.title,
							children: t("market")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.subtitle,
							children: t("managed")
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ManagedMarket_module_css_default.headerActions,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ManagedMarket_module_css_default.actionGhost,
								onClick: () => void refresh(),
								disabled: busy || refreshing,
								children: refreshing ? t("refreshing") : t("retry")
							})
						})]
					}),
					toast === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.alert,
						"data-kind": "success",
						role: "status",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.alertBody,
							children: toast
						})
					}),
					status.restartRequired ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RestartBanner, {
						t,
						phase: restartPhase,
						onRestart: () => void startRestart()
					}) : null,
					busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OperationProgress, {
						t,
						stage: status.stage
					}) : null,
					operationError === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.alert,
						"data-kind": "danger",
						role: "alert",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.alertBody,
							children: operationError
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ManagedMarket_module_css_default.toolbar,
						role: "tablist",
						"aria-label": t("market"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "installed",
								className: tab === "installed" ? ManagedMarket_module_css_default.tabActive : ManagedMarket_module_css_default.tab,
								onClick: () => {
									tabPinned.current = true;
									setTab("installed");
								},
								children: [
									t("installed"),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ManagedMarket_module_css_default.tabCount,
										children: installed.length
									}),
									updatableCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: ManagedMarket_module_css_default.tabBadge,
										children: [
											updatableCount,
											" ",
											t("stateUpdatable")
										]
									}) : null
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === "available",
								className: tab === "available" ? ManagedMarket_module_css_default.tabActive : ManagedMarket_module_css_default.tab,
								onClick: () => {
									tabPinned.current = true;
									setTab("available");
								},
								children: [t("available"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ManagedMarket_module_css_default.tabCount,
									children: catalog?.plugins.length ?? 0
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: ManagedMarket_module_css_default.search,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									placeholder: t("searchPlaceholder"),
									"aria-label": t("search"),
									onChange: (event) => setQuery(event.target.value)
								})
							})
						]
					}),
					tab === "installed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
						className: ManagedMarket_module_css_default.section,
						"aria-label": t("installed"),
						children: installed.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ManagedMarket_module_css_default.emptyCard,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.emptyTitle,
								children: t("emptyInstalledTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.emptyHint,
								children: t("emptyInstalledHint")
							})]
						}) : installedRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.muted,
							children: t("searchEmpty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardColumns, {
							count: layout.count,
							children: installedRows.map((item) => {
								const known = catalog?.plugins.find((p) => p.id === item.id);
								const updatable = known !== void 0 && known.version !== item.version;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CapabilityCard, {
									category: known?.category ?? "",
									name: known?.name ?? item.id,
									meta: `${t("installedVersion")} v${item.version}${updatable ? ` · ${t("updateTo")} v${known.version}` : ""}`,
									description: known?.description ?? "",
									badges: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ManagedMarket_module_css_default.badge,
										"data-kind": "installed",
										children: t("stateInstalled")
									}), updatable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ManagedMarket_module_css_default.badge,
										"data-kind": "update",
										children: t("stateUpdatable")
									}) : null] }),
									action: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ManagedMarket_module_css_default.actionGhost,
										onClick: () => askUninstall(item),
										disabled: busy,
										children: t("remove")
									}), updatable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ManagedMarket_module_css_default.actionPrimary,
										onClick: () => askInstall(known, item),
										disabled: locked,
										children: t("update")
									}) : null] })
								}, item.id);
							})
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: ManagedMarket_module_css_default.section,
						"aria-label": t("available"),
						children: [
							error === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ManagedMarket_module_css_default.alert,
								"data-kind": "danger",
								role: "alert",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										className: ManagedMarket_module_css_default.alertTitle,
										children: t("errorTitle")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: ManagedMarket_module_css_default.alertBody,
										children: error
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: ManagedMarket_module_css_default.alertHint,
										children: t("noFallback")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ManagedMarket_module_css_default.alertActions,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ManagedMarket_module_css_default.actionGhost,
											onClick: () => void refresh(),
											children: t("retryAction")
										})
									})
								]
							}),
							catalog === null && error === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.muted,
								children: t("loading")
							}) : null,
							catalog !== null && catalog.plugins.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.muted,
								children: t("empty")
							}) : null,
							catalog !== null && catalog.plugins.length > 0 && availableRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.muted,
								children: t("searchEmpty")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardColumns, {
								count: layout.count,
								children: availableRows.map((item) => {
									const current = installed.find((p) => p.id === item.id), same = current?.version === item.version;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CapabilityCard, {
										category: item.category,
										name: item.name,
										meta: `${item.category} · v${item.version}`,
										description: item.description,
										badges: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: ManagedMarket_module_css_default.badge,
											"data-kind": item.source === "community" ? "community" : "owned",
											children: t(item.source === "community" ? "community" : "owned")
										}), same ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: ManagedMarket_module_css_default.badge,
											"data-kind": "installed",
											children: t("stateInstalled")
										}) : null] }),
										action: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: same || !item.compatible ? ManagedMarket_module_css_default.actionGhost : ManagedMarket_module_css_default.actionPrimary,
											onClick: () => askInstall(item, current),
											disabled: locked || same || !item.compatible,
											children: !item.compatible ? t("incompatible") : same ? t("stateInstalled") : current === void 0 ? t("install") : t("update")
										})
									}, item.id);
								})
							})
						]
					}),
					catalog === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("footer", {
						className: ManagedMarket_module_css_default.footer,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ManagedMarket_module_css_default.muted,
							children: [
								t("revision"),
								" ",
								catalog.revision
							]
						})
					}),
					pending === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {
						t,
						pending,
						busy,
						onCancel: () => setPending(null),
						onConfirm: () => void run()
					})
				]
			});
		}
		function ManagedModelsSection({ t }) {
			const [data, setData] = (0, react.useState)(null), [key, setKey] = (0, react.useState)(""), [selected, setSelected] = (0, react.useState)("");
			const [rows, setRows] = (0, react.useState)([]), [message, setMessage] = (0, react.useState)(""), [error, setError] = (0, react.useState)(""), [busy, setBusy] = (0, react.useState)(false);
			const apply = (next) => {
				setData(next);
				setSelected(next.selected);
				setRows(next.models.map((model) => ({
					...model,
					vision: model.vision === true,
					contextText: model.contextWindowOverride === void 0 ? "" : String(model.contextWindowOverride)
				})));
			};
			const load = async () => apply(await request("models"));
			(0, react.useEffect)(() => {
				load().catch((e) => setError(String(e)));
			}, []);
			/**
			* 写接口的返回形态不同：save-models / refresh-models 回整套模型状态，
			* credential / select-model 只回 {ok:true}。只有前者能就地套用返回值，
			* 其余统一重新拉一次状态——不能假定每个写接口都回同一份 payload
			* （第一版就假定错了，web 形态下保存令牌会直接卡在无反应）。
			*/
			const action = async (path, body, ok) => {
				setBusy(true);
				setError("");
				setMessage("");
				try {
					const value = await request(path, body);
					if (typeof value?.selected === "string" && Array.isArray(value?.models)) apply(value);
					else await load();
					if (path === "credential") setKey("");
					setMessage(t(ok));
				} catch (e) {
					setError(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			};
			const visionCount = (0, react.useMemo)(() => rows.filter((row) => row.vision).length, [rows]);
			/**
			* 提交前把上下文窗口的原文解析成正整数：空串 = 不声明（回落默认），
			* 其余必须能原样解析，非法就停在本地报错——不能让宿主替我们猜。
			*/
			const collectModelSpecs = () => {
				const models = [];
				for (const row of rows) {
					const text = row.contextText.trim();
					const spec = {
						id: row.id,
						name: row.name,
						vision: row.vision
					};
					if (text !== "") {
						const value = Number(text);
						if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value <= 0) {
							setError(t("contextInvalid"));
							return null;
						}
						spec.contextWindow = value;
					}
					models.push(spec);
				}
				return models;
			};
			const saveModels = () => {
				const models = collectModelSpecs();
				if (models !== null) action("save-models", { models }, "savedModels");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: ManagedMarket_module_css_default.root,
				"aria-label": t("models"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
						className: ManagedMarket_module_css_default.header,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: ManagedMarket_module_css_default.title,
							children: t("models")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.subtitle,
							children: t("fixed")
						})] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: ManagedMarket_module_css_default.footnote,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("site") }),
							" · ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: "https://model.codingrui.work",
								target: "_blank",
								rel: "noopener noreferrer",
								children: t("account")
							})
						]
					}),
					error === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.alert,
						"data-kind": "danger",
						role: "alert",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.alertBody,
							children: error
						})
					}),
					message === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.alert,
						"data-kind": "success",
						role: "status",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ManagedMarket_module_css_default.alertBody,
							children: message
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.footnote,
						children: data?.configured ? t("configured") : t("missing")
					}),
					data?.writable === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.locked,
						children: t("readonly")
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: ManagedMarket_module_css_default.form,
						onSubmit: (event) => {
							event.preventDefault();
							action("credential", { key }, "saved");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ManagedMarket_module_css_default.label,
							children: [t("key"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "password",
								autoComplete: "new-password",
								value: key,
								onChange: (e) => setKey(e.target.value),
								disabled: busy || data?.writable === false
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							className: ManagedMarket_module_css_default.actionPrimary,
							disabled: busy || key.trim().length === 0 || data?.writable === false,
							children: t("save")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ManagedMarket_module_css_default.cardActions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ManagedMarket_module_css_default.actionGhost,
							disabled: busy || data?.configured !== true,
							onClick: () => void action("refresh-models", {}, "savedOk"),
							children: t("refresh")
						})
					}),
					data !== null && data.models.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: ManagedMarket_module_css_default.form,
						onSubmit: (event) => {
							event.preventDefault();
							action("select-model", { model: selected }, "savedModel");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ManagedMarket_module_css_default.label,
							children: [t("select"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								value: selected,
								onChange: (e) => setSelected(e.target.value),
								children: data.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: model.id,
									children: model.name
								}, model.id))
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							className: ManagedMarket_module_css_default.actionPrimary,
							disabled: busy || selected === "",
							children: t("choose")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
						className: ManagedMarket_module_css_default.visionGroup,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("legend", {
								className: ManagedMarket_module_css_default.visionLegend,
								children: [t("visionTitle"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ManagedMarket_module_css_default.visionCount,
									children: [
										"· ",
										t("modelCount"),
										" ",
										data.models.length,
										" · ",
										t("visionOn"),
										" ",
										visionCount
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.visionHint,
								children: t("visionHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ManagedMarket_module_css_default.visionHint,
								children: t("contextHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ManagedMarket_module_css_default.visionRows,
								children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-model-id": row.id,
									className: ManagedMarket_module_css_default.visionRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: ManagedMarket_module_css_default.visionCheck,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: row.vision,
												disabled: busy,
												onChange: (e) => setRows((list) => list.map((item, at) => at === index ? {
													...item,
													vision: e.target.checked
												} : item))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.visionName,
												children: row.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: ManagedMarket_module_css_default.visionState,
												children: [row.vision ? t("visionOn") : t("visionOff"), row.id === data.selected ? ` · ${t("modelSelected")}` : ""]
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: ManagedMarket_module_css_default.contextField,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.contextLabel,
												children: t("contextField")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: ManagedMarket_module_css_default.contextInput,
												type: "number",
												min: 1,
												step: 1024,
												inputMode: "numeric",
												value: row.contextText,
												placeholder: row.contextWindow === void 0 ? t("visionDefault") : String(row.contextWindow),
												disabled: busy,
												onChange: (e) => setRows((list) => list.map((item, at) => at === index ? {
													...item,
													contextText: e.target.value
												} : item))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ManagedMarket_module_css_default.contextUnit,
												children: t("contextUnit")
											})
										]
									})]
								}, row.id))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ManagedMarket_module_css_default.visionActions,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ManagedMarket_module_css_default.actionPrimary,
									disabled: busy || rows.length === 0,
									onClick: saveModels,
									children: t("saveModels")
								})
							})
						]
					})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ManagedMarket_module_css_default.footnote,
						children: t("none")
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-market client: registers a "Market" settings section rendering the
		* plugin market UI, plus the post-install toast in the shell overlay layer.
		* Built by tsdown into the __ModuleLoader__ factory bundle at
		* client/client.js; the only externals are the loader module table's react
		* entries.
		*/
		/**
		* Primitives this bundle relies on that did not exist before rc.6. The
		* primitives module is host-injected (external at build time), so on an
		* older host the module resolves but these named exports are undefined —
		* rendering would throw and blank the whole settings dialog. Returning the
		* gaps lets apply() skip registration for a clean downgrade instead.
		*/
		const REQUIRED_PRIMITIVES = [
			"Menu",
			"DisclosureRow",
			"Tooltip",
			"Toast"
		];
		function missingPrimitives(mod, required = REQUIRED_PRIMITIVES) {
			return required.filter((name) => mod[name] === void 0);
		}
		const name = "lawyer-market";
		const inject = [
			"slots",
			"locale",
			"theme"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("lawyer-market", {
				zh: managedZh,
				en: managedEn
			}), "lawyer-market: locale");
			const t = ctx.locale.bind("lawyer-market");
			ctx.slots.inject("settings.section", () => {
				const a = ctx.slots.register({
					name: "settings.section",
					id: "models",
					order: 30,
					label: () => t("models"),
					locale: "lawyer-market",
					inject: () => ({ t })
				}, () => (0, react.createElement)(ManagedModelsSection, { t }));
				const b = ctx.slots.register({
					name: "settings.section",
					id: "lawyer-market",
					order: 40,
					label: () => t("market"),
					locale: "lawyer-market",
					inject: () => ({ t })
				}, () => (0, react.createElement)(ManagedMarketSection, { t }));
				return () => {
					if (typeof a === "function") a();
					if (typeof b === "function") b();
				};
			});
		}
		//#endregion
		exports.REQUIRED_PRIMITIVES = REQUIRED_PRIMITIVES;
		exports.apply = apply;
		exports.inject = inject;
		exports.missingPrimitives = missingPrimitives;
		exports.name = name;
		return module.exports;
	}
});
