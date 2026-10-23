/**
 * Jasvi Industries ERP - UiSemanticRegistry
 * Canonical Semantic Presentation Registry matching desktop UiSemanticRegistry.java
 * and semantic-registry.properties.
 *
 * Centralizes all icon identities, color families, and vocabulary mappings
 * so every screen shares the exact same visual language.
 */
window.UiSemanticRegistry = (function() {
  'use strict';

  // Desktop semantic-registry.properties Full Parity
  const DESKTOP_SEMANTICS = {"account-holder":{"icon":"\ud83d\udc64","fa":"fas-user-check","colour":"blue"},"account-number":{"icon":"\ud83d\udcb3","fa":"fas-money-check-alt","colour":"indigo"},"actions":{"icon":"\ud83d\udccb","fa":"fas-list-ul","colour":"purple"},"active":{"icon":"\u2705","fa":"fas-check-circle","colour":"green"},"address":{"icon":"\ud83d\udccd","fa":"fas-map-marked-alt","colour":"pink"},"alignment":{"icon":"\u2261","fa":"fas-align-left","colour":"purple"},"amount":{"icon":"\u20b9","fa":"fas-rupee-sign","colour":"green"},"application":{"icon":"\ud83d\udda5\ufe0f","fa":"fas-desktop","colour":"purple"},"approve":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-thumbs-up","colour":"green"},"attachment":{"icon":"\ud83d\udcce","fa":"fas-paperclip","colour":"teal"},"backup":{"icon":"\ud83d\uddc4\ufe0f","fa":"fas-database","colour":"teal"},"balance":{"icon":"\ud83d\udcbc","fa":"fas-wallet","colour":"orange"},"bank":{"icon":"\ud83c\udfe6","fa":"fas-university","colour":"purple"},"bank-account":{"icon":"\ud83d\udcb3","fa":"fas-money-check","colour":"blue"},"binding":{"icon":"\ud83c\udf3f","fa":"fas-project-diagram","colour":"indigo"},"border":{"icon":"\ud83d\udcd0","fa":"fas-vector-square","colour":"purple"},"branch":{"icon":"\ud83c\udf3f","fa":"fas-code-branch","colour":"blue"},"business":{"icon":"\ud83c\udfe2","fa":"fas-building","colour":"blue"},"calendar":{"icon":"\ud83d\udcc5","fa":"fas-calendar-alt","colour":"purple"},"category":{"icon":"\ud83d\udcc1","fa":"fas-layer-group","colour":"orange"},"cell":{"icon":"\u25a6","fa":"fas-th","colour":"blue"},"code":{"icon":"|||","fa":"fas-barcode","colour":"indigo"},"columns":{"icon":"\u25a5","fa":"fas-columns","colour":"blue"},"communication":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-comments","colour":"teal"},"compatibility":{"icon":"\ud83d\udd17","fa":"fas-link","colour":"blue"},"complete":{"icon":"\u2705","fa":"fas-check-circle","colour":"green"},"contact-person":{"icon":"\ud83d\udcc7","fa":"fas-address-card","colour":"teal"},"create":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-plus-circle","colour":"green"},"credit":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrow-circle-up","colour":"green"},"currency":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-coins","colour":"green"},"customer":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-user-tag","colour":"blue"},"database":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-server","colour":"blue"},"date":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-calendar-day","colour":"purple"},"debit":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrow-circle-down","colour":"pink"},"delete":{"icon":"\ud83d\uddd1\ufe0f","fa":"fas-trash-alt","colour":"pink"},"delivery":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-shipping-fast","colour":"orange"},"department":{"icon":"\ud83c\udf3f","fa":"fas-sitemap","colour":"teal"},"deployment":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-rocket","colour":"purple"},"description":{"icon":"\u2261","fa":"fas-align-left","colour":"purple"},"discount":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-tags","colour":"orange"},"document":{"icon":"\ud83d\udcc4","fa":"fas-file-alt","colour":"purple"},"document-status":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-clipboard-check","colour":"purple"},"edit":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-pen","colour":"blue"},"email":{"icon":"\u2709\ufe0f","fa":"fas-envelope","colour":"teal"},"email-status":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-paper-plane","colour":"teal"},"error":{"icon":"\u26a0\ufe0f","fa":"fas-exclamation-triangle","colour":"pink"},"export":{"icon":"\ud83d\udce5","fa":"fas-download","colour":"blue"},"favorite":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-star","colour":"orange"},"fill":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-fill-drip","colour":"purple"},"financial-year":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-calendar-check","colour":"blue"},"font":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-font","colour":"purple"},"format":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-code","colour":"indigo"},"frequency":{"icon":"\ud83d\udd04","fa":"fas-sync-alt","colour":"orange"},"geometry":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-drafting-compass","colour":"teal"},"grouping":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-object-group","colour":"purple"},"gstin":{"icon":"\ud83e\uddfe","fa":"fas-receipt","colour":"orange"},"height":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ruler-vertical","colour":"teal"},"history":{"icon":"\ud83d\udcdc","fa":"fas-history","colour":"blue"},"ifsc":{"icon":"|||","fa":"fas-barcode","colour":"indigo"},"image":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-image","colour":"purple"},"import":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-import","colour":"green"},"industry":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-industry","colour":"orange"},"info":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-info-circle","colour":"blue"},"inspector":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-search-plus","colour":"indigo"},"installer":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-compact-disc","colour":"orange"},"inventory":{"icon":"\ud83d\udce6","fa":"fas-boxes","colour":"teal"},"invoice":{"icon":"\ud83e\uddfe","fa":"fas-file-invoice","colour":"blue"},"invoice-amount":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-invoice-dollar","colour":"green"},"item":{"icon":"\ud83d\udce6","fa":"fas-box","colour":"orange"},"line-spacing":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-text-height","colour":"purple"},"link":{"icon":"\ud83d\udd17","fa":"fas-link","colour":"blue"},"location":{"icon":"\ud83d\udccd","fa":"fas-map-marker-alt","colour":"teal"},"lock":{"icon":"\ud83d\udd12","fa":"fas-lock","colour":"orange"},"logo":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-images","colour":"purple"},"mapping":{"icon":"\ud83c\udf3f","fa":"fas-project-diagram","colour":"blue"},"mfa":{"icon":"\ud83d\udee1\ufe0f","fa":"fas-shield-alt","colour":"purple"},"mode":{"icon":"\u2699\ufe0f","fa":"fas-sliders-h","colour":"purple"},"module":{"icon":"\ud83d\udce6","fa":"fas-cubes","colour":"purple"},"notes":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-sticky-note","colour":"purple"},"number":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-list-ol","colour":"indigo"},"object":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-cube","colour":"purple"},"opacity":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-adjust","colour":"purple"},"opening-balance":{"icon":"\ud83d\udcbc","fa":"fas-wallet","colour":"blue"},"padding":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-expand-arrows-alt","colour":"teal"},"paid":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-check-double","colour":"green"},"pan":{"icon":"\ud83e\udeaa","fa":"fas-id-card","colour":"purple"},"partial":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-adjust","colour":"blue"},"password":{"icon":"\ud83d\udd11","fa":"fas-key","colour":"pink"},"payment":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-credit-card","colour":"blue"},"payment-status":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-money-bill-wave","colour":"green"},"pending":{"icon":"\u23f3","fa":"fas-hourglass-half","colour":"orange"},"permission":{"icon":"\ud83d\udd11","fa":"fas-key","colour":"purple"},"phone":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-phone-alt","colour":"teal"},"platform":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-laptop","colour":"blue"},"port":{"icon":"\ud83c\udf10","fa":"fas-network-wired","colour":"indigo"},"priority":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-exclamation-circle","colour":"orange"},"protected-source":{"icon":"\ud83d\udd12","fa":"fas-lock","colour":"purple"},"qr":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-qrcode","colour":"indigo"},"quantity":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-sort-numeric-up","colour":"orange"},"quotation":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-signature","colour":"purple"},"radius":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-circle-notch","colour":"purple"},"range":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt-h","colour":"blue"},"rate":{"icon":"\ud83d\udcc8","fa":"fas-chart-line","colour":"green"},"reconciliation":{"icon":"\u2696\ufe0f","fa":"fas-balance-scale","colour":"teal"},"record":{"icon":"\ud83d\uddc4\ufe0f","fa":"fas-database","colour":"indigo"},"recovery":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-life-ring","colour":"blue"},"reference":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-hashtag","colour":"indigo"},"refresh":{"icon":"\ud83d\udd04","fa":"fas-sync-alt","colour":"blue"},"repeater":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-redo-alt","colour":"purple"},"report":{"icon":"\ud83d\udcca","fa":"fas-chart-bar","colour":"pink"},"repository":{"icon":"\ud83d\udc19","fa":"fab-github","colour":"purple"},"retention":{"icon":"\ud83d\udce6","fa":"fas-archive","colour":"blue"},"return":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-undo-alt","colour":"purple"},"role":{"icon":"\ud83d\udee1\ufe0f","fa":"fas-user-shield","colour":"purple"},"rollback":{"icon":"\ud83d\udcdc","fa":"fas-history","colour":"orange"},"rotation":{"icon":"\ud83d\udd04","fa":"fas-sync","colour":"purple"},"sale":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-shopping-cart","colour":"green"},"scope":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-crosshairs","colour":"indigo"},"search":{"icon":"\ud83d\udd0d","fa":"fas-search","colour":"blue"},"section":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-th-large","colour":"purple"},"security":{"icon":"\ud83d\udee1\ufe0f","fa":"fas-shield-alt","colour":"indigo"},"security-code":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-fingerprint","colour":"pink"},"server":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-server","colour":"blue"},"settings":{"icon":"\u2699\ufe0f","fa":"fas-cog","colour":"purple"},"shortcut":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-keyboard","colour":"purple"},"signature":{"icon":"\u270d\ufe0f","fa":"fas-signature","colour":"purple"},"size":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ruler-combined","colour":"teal"},"sorting":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-sort-amount-down","colour":"blue"},"source":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-sign-in-alt","colour":"orange"},"status":{"icon":"\ud83d\udccb","fa":"fas-tasks","colour":"purple"},"structure":{"icon":"\ud83c\udf3f","fa":"fas-sitemap","colour":"purple"},"supplier":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-truck-loading","colour":"teal"},"tagline":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-quote-left","colour":"purple"},"tax":{"icon":"%","fa":"fas-percentage","colour":"orange"},"terms":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-contract","colour":"purple"},"time":{"icon":"\u23f0","fa":"fas-clock","colour":"blue"},"tolerance":{"icon":"\u2699\ufe0f","fa":"fas-sliders-h","colour":"orange"},"transporter":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-truck-moving","colour":"orange"},"type":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-tags","colour":"orange"},"unit":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ruler","colour":"teal"},"update":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-cloud-download-alt","colour":"purple"},"upi":{"icon":"\ud83d\udcf1","fa":"fas-mobile-alt","colour":"green"},"user":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-user-circle","colour":"blue"},"username":{"icon":"\ud83d\udc64","fa":"fas-user","colour":"blue"},"value":{"icon":"\ud83e\uddee","fa":"fas-calculator","colour":"indigo"},"vehicle":{"icon":"\ud83d\ude9a","fa":"fas-truck","colour":"orange"},"version":{"icon":"\ud83c\udf3f","fa":"fas-code-branch","colour":"blue"},"view":{"icon":"\ud83d\udc41\ufe0f","fa":"fas-eye","colour":"blue"},"warning":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-exclamation-circle","colour":"orange"},"website":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-globe","colour":"blue"},"whatsapp":{"icon":"\ud83d\udcac","fa":"fab-whatsapp","colour":"green"},"width":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ruler-horizontal","colour":"teal"},"worksheet":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-table","colour":"blue"},"workspace":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-folder","colour":"blue"},"x-position":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt-h","colour":"indigo"},"y-position":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt-v","colour":"indigo"},"filter":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-filter","colour":"teal"},"reminder":{"icon":"\u23f0","fa":"fas-clock","colour":"orange"},"notification":{"icon":"\ud83d\udd14","fa":"fas-bell","colour":"purple"},"storage-usage":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-chart-pie","colour":"blue"},"storage-retention":{"icon":"\ud83d\udce6","fa":"fas-archive","colour":"purple"},"log":{"icon":"\ud83d\udccb","fa":"fas-clipboard-list","colour":"orange"},"diagnostic":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-archive","colour":"teal"},"temporary":{"icon":"\u23f3","fa":"fas-hourglass-half","colour":"indigo"},"evidence":{"icon":"\ud83d\udee1\ufe0f","fa":"fas-shield-alt","colour":"green"},"protected":{"icon":"\ud83d\udd12","fa":"fas-lock","colour":"green"},"reject":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ban","colour":"pink"},"ignore":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-eye-slash","colour":"orange"},"bill":{"icon":"\ud83e\uddfe","fa":"fas-receipt","colour":"blue"},"template":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-code","colour":"indigo"},"publish":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-cloud-upload-alt","colour":"green"},"set-default":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-star","colour":"orange"},"field-properties":{"icon":"\u2699\ufe0f","fa":"fas-sliders-h","colour":"purple"},"paste-format":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-paint-brush","colour":"purple"},"replace-image":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-images","colour":"teal"},"add-page":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-medical","colour":"green"},"bring-front":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-level-up-alt","colour":"purple"},"bring-forward":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrow-up","colour":"blue"},"show-hide":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-toggle-on","colour":"blue"},"line":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-minus","colour":"indigo"},"charge":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-coins","colour":"orange"},"merge":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-object-group","colour":"purple"},"paste":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-clipboard","colour":"blue"},"reload":{"icon":"\ud83d\udd04","fa":"fas-sync-alt","colour":"purple"},"bold":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-bold","colour":"orange"},"italic":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-italic","colour":"orange"},"underline":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-underline","colour":"orange"},"align-left":{"icon":"\u2261","fa":"fas-align-left","colour":"blue"},"align-center":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-align-center","colour":"teal"},"align-right":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-align-right","colour":"indigo"},"align-top":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-angle-up","colour":"blue"},"align-middle":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-grip-lines","colour":"teal"},"align-bottom":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-angle-down","colour":"indigo"},"distribute-horizontal":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt-h","colour":"purple"},"distribute-vertical":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt-v","colour":"purple"},"wrap":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-text-width","colour":"blue"},"no-fill":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-tint-slash","colour":"teal"},"insert-row":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-plus-square","colour":"green"},"insert-column":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-plus-circle","colour":"green"},"rows":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-stream","colour":"purple"},"freeze":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-snowflake","colour":"teal"},"apply":{"icon":"\u2714","fa":"fas-check","colour":"green"},"change-file":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-exchange-alt","colour":"blue"},"disable":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-ban","colour":"pink"},"clean":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-broom","colour":"orange"},"package-folder":{"icon":"\ud83d\udce6","fa":"fas-box-open","colour":"orange"},"recovery-folder":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-life-ring","colour":"blue"},"database-recovery":{"icon":"\ud83d\uddc4\ufe0f","fa":"fas-database","colour":"blue"},"navigation":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-compass","colour":"blue"},"capture":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-keyboard","colour":"purple"},"administrator":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-user-cog","colour":"purple"},"exit":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-sign-out-alt","colour":"pink"},"move":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-arrows-alt","colour":"blue"},"find-another":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-search-plus","colour":"blue"},"match":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-handshake","colour":"green"},"partial-settlement":{"icon":"\u2696\ufe0f","fa":"fas-balance-scale","colour":"orange"},"stay-signed-in":{"icon":"\ud83d\udd13","fa":"fas-lock-open","colour":"green"},"github":{"icon":"\ud83d\udc19","fa":"fab-github","colour":"indigo"},"later":{"icon":"\u23f0","fa":"fas-clock","colour":"orange"},"schedule":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-calendar-plus","colour":"purple"},"run":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-play","colour":"green"},"pause":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-pause","colour":"orange"},"archive":{"icon":"\ud83d\udce6","fa":"fas-archive","colour":"purple"},"duplicate":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-clone","colour":"purple"},"resend":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-redo-alt","colour":"blue"},"refund":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-money-bill-wave","colour":"teal"},"page":{"icon":"\ud83d\udcc4","fa":"fas-file","colour":"blue"},"name":{"icon":"\ud83e\udeaa","fa":"fas-id-badge","colour":"blue"},"designation":{"icon":"\ud83d\udcbc","fa":"fas-briefcase","colour":"purple"},"primary":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-star","colour":"orange"},"outstanding":{"icon":"\u23f3","fa":"fas-hourglass-half","colour":"orange"},"reason":{"icon":"\ud83d\udcac","fa":"fas-comment-alt","colour":"orange"},"approval":{"icon":"\ud83d\udc64","fa":"fas-user-check","colour":"green"},"branding":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-palette","colour":"purple"},"guidance":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-info-circle","colour":"blue"},"business-health":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-heartbeat","colour":"green"},"palette":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-swatchbook","colour":"purple"},"repeating-rows":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-stream","colour":"purple"},"lookup":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-list","colour":"blue"},"personal":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-user-circle","colour":"blue"},"safety-sequence":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-list-ol","colour":"orange"},"release-source":{"icon":"\ud83d\udc19","fa":"fab-github","colour":"indigo"},"matching":{"icon":"\ud83c\udf3f","fa":"fas-project-diagram","colour":"teal"},"captcha":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-robot","colour":"purple"},"mark-all-read":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-check-double","colour":"green"},"mark-read":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-envelope-open","colour":"teal"},"open-record":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-external-link-alt","colour":"blue"},"dismiss":{"icon":"\u274c","fa":"fas-times-circle","colour":"pink"},"group":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-object-group","colour":"purple"},"ungroup":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-object-ungroup","colour":"orange"},"purchase":{"icon":"\ud83d\udcbc","fa":"fas-briefcase","colour":"orange"},"purchase-order":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-file-invoice-dollar","colour":"orange"},"sales-order":{"icon":"\ud83d\udccb","fa":"fas-clipboard-list","colour":"green"},"dispatch":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-shipping-fast","colour":"teal"},"goods-receipt":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-dolly-flatbed","colour":"teal"},"project":{"icon":"\ud83c\udf3f","fa":"fas-project-diagram","colour":"purple"},"ledger":{"icon":"\ud83c\udff7\ufe0f","fa":"fas-book","colour":"blue"},"automation":{"icon":"\u2699\ufe0f","fa":"fas-cogs","colour":"teal"}};
  const DESKTOP_FIELDS = {"0.of.0.granted":"permission","0.users.use.this.role":"role","a1":"cell","access.level":"permission","account":"bank-account","account.holder.name":"account-holder","account.number":"account-number","action":"actions","active":"active","additional.charges":"amount","address":"address","align":"alignment","amount":"amount","amount.from":"amount","amount.paid":"amount","amount.received":"amount","amount.to":"amount","app.password":"password","application.banner":"image","application.mark.splash.logo":"logo","application.name":"application","application.tagline":"tagline","applies.to":"scope","attached.document":"attachment","attachment":"attachment","attachments":"attachment","authorized.signature":"signature","availability":"status","bank.account":"bank-account","bank.name":"bank","bank.status":"status","batch.progress":"status","billing.address":"address","billing.gstin":"gstin","border.width":"border","bottom":"padding","box.padding":"padding","branch":"branch","branch.location":"branch","business.address":"address","business.tagline":"tagline","business.type":"type","category":"category","cgst":"tax","charge.gst":"tax","code":"code","company.address":"address","company.email":"email","company.name":"business","company.server.address":"server","confirm.new.password":"password","confirm.password":"password","contact":"contact-person","contact.mobile":"phone","contact.person":"contact-person","content.erp.mapping":"mapping","context.behaviour":"settings","copy.from.role":"role","currency":"currency","current.version":"version","customer":"customer","customer.supplier":"customer","database.and.configuration":"database","database.location":"database","date":"date","date.format":"date","days":"retention","default.discount":"discount","default.ship.to.address":"address","delivery.address":"address","delivery.gstin":"gstin","department":"department","deployment":"deployment","description":"description","discount":"discount","display.order":"number","document.status":"document-status","drag.a.field.onto.blank.space.or.directly.onto.detected.pdf.text":"mapping","drag.or.click":"attachment","dse.erp.will.create":"info","due":"pending","due.date":"date","each.item.charge.row.is.generated.from.live.erp.data.and.can.paginate.automatically":"rate","email":"email","email.address":"email","email.app.password":"password","email.or.username":"username","email.status":"email-status","erp.field.binding":"binding","existing.records":"history","fill":"fill","financial.year.start":"financial-year","fit":"view","follow.up":"reminder","font":"font","frequency":"frequency","from.date":"date","full.name":"user","geometry":"geometry","gst":"tax","gst.amount":"tax","gst.rate":"tax","gst.type":"tax","gstin":"gstin","gstin.tax.id":"gstin","header":"document","height":"height","how.the.payment.qr.is.used":"qr","hsn.code":"code","ifsc.code":"ifsc","igst":"tax","image":"image","industry":"industry","inspector":"inspector","invoice.amount":"invoice-amount","invoice.date":"date","invoice.logo":"logo","invoice.no":"invoice","invoice.terms":"terms","invoice.type":"type","invoice.value":"amount","item":"item","item.code":"code","keep.backups.for":"retention","last.checked":"date","last.login":"date","latest.recovery.point":"recovery","latest.version":"version","left":"padding","line.spacing":"line-spacing","local.mode.preserves.the.current.single.pc.operation.shared.client.mode.connects.this.desktop.to.one.company.server.after.restart":"business","mapping":"mapping","max.amount":"amount","mfa":"mfa","min.amount":"amount","minimum.stock":"quantity","mode":"mode","moving.the.workspace.safely":"workspace","multi.factor.verification.code":"security-code","name":"user","new.password":"password","no.preview.loaded":"view","no.shortcut.conflicts.detected":"number","not.merged":"status","notes":"notes","notes.and.attachment":"notes","object":"object","opacity":"opacity","opening.amount.is.optional":"amount","opening.balance":"opening-balance","opening.stock":"quantity","original.document":"document","original.invoice":"invoice","other.rounding":"amount","pad.top":"padding","paid":"paid","paid.to":"supplier","pan":"pan","party":"customer","password":"password","payment":"payment","payment.date":"date","payment.mode":"payment","payment.status":"payment-status","payment.terms":"terms","pending":"pending","period":"date","permission.guard":"permission","permission.template":"permission","phone":"phone","platform":"platform","po.no":"purchase-order","po.supplier.ref":"reference","preview.record":"record","priority":"priority","protected.source":"protected-source","purchase.date":"date","purchase.invoice.no":"invoice","purchase.no":"purchase-order","purchase.price":"amount","purchase.recon.register":"purchase-order","quotation.date":"date","quotation.no":"quotation","rack.location":"location","radius":"radius","range":"range","received.from":"customer","recommended":"info","recon.supplier":"supplier","recon.supplier.register":"supplier","reconciliation.status":"reconciliation","recovery.and.documents":"recovery","reference":"reference","reference.no":"reference","reference.utr.cheque.no":"reference","refund.amount":"amount","refund.date":"date","refund.status":"status","refunded.to":"customer","remarks":"notes","repeater":"repeater","repository.name":"repository","repository.owner":"user","reset.verification.code":"security-code","return.amount":"amount","return.date":"date","return.no":"return","return.status":"status","return.total":"amount","right":"padding","role":"role","public.registration.role":"role","rotation":"rotation","round.off.tolerance.amount":"tolerance","row.height":"height","sales.person":"user","salesperson":"user","scope.resolution":"scope","search":"search","section.group":"section","selling.price":"amount","sending.email":"email","sending.email.address":"email","sgst.utgst":"tax","shortcut.keys":"shortcut","size":"size","smtp.host":"server","smtp.port":"port","source":"source","startup.message":"tagline","state.place.of.supply":"location","statement.bank.account":"bank-account","statement.from":"date","statement.to":"date","status":"status","structure":"structure","subtotal":"amount","supplier":"supplier","supplier.invoice.no":"invoice","system.generated.master.identifier":"code","taxable":"amount","taxable.value":"amount","time.zone":"time","to":"range","to.date":"date","total.amount":"amount","trade.legal.name":"business","transaction.type":"type","transporter":"transporter","transporter.gstin":"gstin","type":"type","unit":"unit","update.channel":"update","upi.id":"upi","upload.bill.optional":"attachment","used.on.splash.and.sign.in.screens.document.branding.remains.independent":"document","username":"username","valid.until":"date","valid.upto":"date","value":"value","vehicle.no":"vehicle","vehicle.number":"vehicle","verification.code":"security-code","warehouse.location":"location","website":"website","whatsapp.status":"whatsapp","width":"width","worksheet":"worksheet","workspace.location":"workspace","x":"x-position","y":"y-position","direction":"sorting","group.by":"grouping","sort":"sorting","dashboard.period":"date","report.categories":"category","rows.per.page":"number","gross.margin":"amount","format":"format","grn.no":"goods-receipt","authenticator.verification.code":"security","authenticator.code.non-admin.only":"security","full.name.user":"user","account.security":"security","alignment":"alignment","authenticator.code.non.admin.only":"security","assign.final.role":"role","loading.captcha":"security","registration.role":"role","step.2.email.otp":"email","step.3.google.microsoft.authenticator":"security","quotation.source":"quotation","sales.order":"sales-order","purchase.order":"purchase-order","goods.receipt":"goods-receipt","grn":"goods-receipt","dispatch":"dispatch","dispatch.no":"dispatch","document.date":"date","party.customer.supplier":"customer","line.items":"item","session.timeout.minutes":"time","warning.before.logout.minutes":"warning","number":"number","project.no":"project","project.job.no":"project","parent.reference":"reference","source.quotation.reference":"quotation","customer.po.no":"purchase-order","related.sales.order":"sale","sales.order.no":"sales-order","purchase.order.no":"purchase-order","start.date":"date","target.date":"date","order.date":"date","po.date":"date","receipt.date":"date","dispatch.date":"date","expected.date":"date","inspection.accepted.date":"date","expected.delivery.date":"date","schedule.name":"document","run.day":"calendar","output":"export","recipients":"email","authentication.mfa.policy":"security","workspace.and.storage":"workspace","current.workspace":"workspace","protected.workspace.data":"protected","permanent.business.evidence":"evidence","storage.usage":"storage-usage","storage.retention":"storage-retention","logs.retention":"log","reports.retention":"report","exports.retention":"export","diagnostic.zip.retention":"diagnostic","import.result.retention":"import","temporary.files.retention":"temporary","old.log.archives":"log","documents":"document","reports.exports":"export","logs.temp":"temporary","safe.cleanup.boundary":"protected","erp.json.field":"mapping","position.and.size":"geometry","repeating.table":"repeater","pages":"page","latest.available":"update","how.matching.works":"matching","recent.activities":"history","erp.field.palette":"palette","repeating.rows":"repeating-rows","lookup.values":"lookup","basic.information":"info","available.erp.json.fields":"mapping","field.properties":"field-properties","mapped.fields":"mapping","personal.details":"personal","admin.approval.required":"approval","reason":"reason","step.1.captcha":"captcha","1.1":"page","business.health":"business-health","available.previous.versions":"version","safety.sequence":"safety-sequence","admin.approval":"approval","company.billing":"business","application.branding":"branding","connection.guidance":"guidance","information.&.guidance":"guidance","information.and.guidance":"guidance","preview.live.output":"view","browse.image":"attachment","clear.image":"delete","security.session":"security","github.release.source":"release-source","this.month":"calendar","this.quarter":"calendar","this.year":"calendar","all.time":"calendar","sgst":"tax","total.itc":"tax","supplier.gstin":"gstin","recon.status":"status","itc.eligibility":"complete","document.reference":"document","tax.breakdown":"tax","compliance.status":"status","debit.note.no":"debit","credit.note.no":"credit","original.bill":"document","financial.and.itc.reversal":"tax","cgst.reversal":"tax","sgst.reversal":"tax","igst.reversal":"tax","total.claim":"amount","inventory.and.status":"status","items.dispatched":"delivery","invoice.ref":"document","financial.breakdown":"amount","inventory.and.accounting":"ledger","stock.restocked":"inventory","taxable.amount":"amount","0.to.30.days.current":"amount","31.to.60.days":"amount","61.to.90.days":"amount","over.90.days":"amount","total.outstanding":"amount","account.group":"category","phone.contact":"phone","bucket.breakdown":"category","account.information":"contact-person"};

  // 1. Color Palette Definitions (matching desktop CSS & AppDialogRenderer)
  const COLOURS = {
    blue: { name: 'blue', hex: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
    purple: { name: 'purple', hex: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.35)' },
    green: { name: 'green', hex: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
    whatsapp: { name: 'whatsapp', hex: '#25D366', bg: 'rgba(37, 211, 102, 0.22)', border: 'rgba(37, 211, 102, 0.55)' },
    email: { name: 'email', hex: '#38bdf8', bg: 'rgba(56, 189, 248, 0.22)', border: 'rgba(56, 189, 248, 0.55)' },
    indigo: { name: 'indigo', hex: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' },
    orange: { name: 'orange', hex: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
    pink: { name: 'pink', hex: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.35)' },
    teal: { name: 'teal', hex: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)', border: 'rgba(45, 212, 191, 0.35)' },
    yellow: { name: 'yellow', hex: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)' },
    red: { name: 'red', hex: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.35)' },
    neutral: { name: 'neutral', hex: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' }
  };

  // 2. Semantic Vocabulary to Icon & Color Mapping
  // Exact desktop parity mapping
  const SEMANTICS = {
    'document': { icon: '📄', colour: 'purple', label: 'Document' },
    'invoice': { icon: '🧾', colour: 'purple', label: 'Invoice' },
    'purchase': { icon: '📦', colour: 'indigo', label: 'Purchase' },
    'quotation': { icon: '📝', colour: 'blue', label: 'Quotation' },
    'return': { icon: '🔄', colour: 'orange', label: 'Return' },
    'date': { icon: '📅', colour: 'purple', label: 'Date' },
    'calendar': { icon: '📅', colour: 'purple', label: 'Calendar' },
    'time': { icon: '⏰', colour: 'teal', label: 'Time' },
    'customer': { icon: '👤', colour: 'blue', label: 'Customer' },
    'supplier': { icon: '🏭', colour: 'indigo', label: 'Supplier' },
    'party': { icon: '👥', colour: 'blue', label: 'Party' },
    'user': { icon: '👤', colour: 'teal', label: 'User' },
    'contact': { icon: '📇', colour: 'teal', label: 'Contact' },
    'phone': { icon: '📞', colour: 'teal', label: 'Phone' },
    'mobile': { icon: '📱', colour: 'teal', label: 'Mobile' },
    'email': { icon: '✉️', colour: 'email', label: 'Email' },
    'whatsapp': { icon: '💬', colour: 'whatsapp', label: 'WhatsApp' },
    'address': { icon: '📍', colour: 'pink', label: 'Address' },
    'location': { icon: '📍', colour: 'pink', label: 'Location' },
    'amount': { icon: '💰', colour: 'green', label: 'Amount' },
    'total': { icon: '₹', colour: 'green', label: 'Total' },
    'balance': { icon: '💼', colour: 'orange', label: 'Balance' },
    'paid': { icon: '💳', colour: 'green', label: 'Paid' },
    'due': { icon: '⏳', colour: 'yellow', label: 'Due' },
    'tax': { icon: '🏷️', colour: 'orange', label: 'Tax' },
    'gst': { icon: '🏷️', colour: 'orange', label: 'GST' },
    'gstin': { icon: '🏷️', colour: 'orange', label: 'GSTIN' },
    'hsn': { icon: '🔢', colour: 'indigo', label: 'HSN' },
    'item': { icon: '🏷️', colour: 'blue', label: 'Item' },
    'sku': { icon: '🔖', colour: 'indigo', label: 'SKU' },
    'description': { icon: '📋', colour: 'purple', label: 'Description' },
    'quantity': { icon: '📦', colour: 'orange', label: 'Quantity' },
    'unit': { icon: '📏', colour: 'teal', label: 'Unit' },
    'rate': { icon: '💲', colour: 'green', label: 'Rate' },
    'discount': { icon: '🏷️', colour: 'orange', label: 'Discount' },
    'status': { icon: '🏷️', colour: 'purple', label: 'Status' },
    'actions': { icon: '⚙️', colour: 'purple', label: 'Actions' },
    'category': { icon: '📁', colour: 'orange', label: 'Category' },
    'bank': { icon: '🏦', colour: 'blue', label: 'Bank' },
    'account': { icon: '💳', colour: 'indigo', label: 'Account' },
    'reference': { icon: '🔗', colour: 'indigo', label: 'Reference' },
    'security': { icon: '🛡️', colour: 'purple', label: 'Security' },
    'notes': { icon: '📝', colour: 'neutral', label: 'Notes' },
    'transporter': { icon: '🚚', colour: 'orange', label: 'Transporter' },
    'delivery': { icon: '🚚', colour: 'orange', label: 'Delivery' },
    'vehicle': { icon: '🚛', colour: 'orange', label: 'Vehicle' },
    'e-way': { icon: '🚚', colour: 'cyan', label: 'E-Way Bill' },
    'payment-mode': { icon: '💳', colour: 'indigo', label: 'Payment Mode' },
    'print': { icon: '🖨️', colour: 'blue', label: 'Print' },
    'barcode': { icon: '|||', colour: 'indigo', label: 'Barcode' },
    'link': { icon: '🔗', colour: 'blue', label: 'Link' },
    'audit': { icon: '📜', colour: 'neutral', label: 'Audit' },
    'salesperson': { icon: '👔', colour: 'teal', label: 'Salesperson' },
    'check': { icon: '☑️', colour: 'blue', label: 'Select' }
  };

  function normalize(str) {
    if (!str) return '';
    return str.toString().toLowerCase().trim()
      .replace(/&amp;/g, 'and')
      .replace(/&/g, 'and')
      .replace(/₹/g, 'amount')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  return {
    COLOURS,
    SEMANTICS,

    /**
     * Resolves header icon and colour theme based on column heading text
     */
    headerSemantic(headingText, columnId) {
      const text = normalize(headingText);
      const id = normalize(columnId);
      const combined = (text + ' ' + id).trim();

      if (!text && !id) return { icon: '📋', colour: 'neutral', label: '' };

      // Exact & substring priority matching (matching Desktop ProfessionalUiEnhancer.java)
      if (text === '#' || text === 'no' || text === 'sr no' || text === 'select' || id.includes('select') || id.includes('checkbox')) {
        return { icon: '☑️', colour: 'blue', label: headingText, isCheckbox: true };
      }
      if (combined.includes('invoice') || combined.includes('bill no') || combined.includes('voucher') || combined.includes('doc no') || combined.includes('document')) {
        return { icon: '📄', colour: 'purple', label: headingText };
      }
      if (combined.includes('purchase no') || combined.includes('po no') || combined.includes('inward no')) {
        return { icon: '📦', colour: 'indigo', label: headingText };
      }
      if (combined.includes('quotation') || combined.includes('quote no')) {
        return { icon: '📝', colour: 'blue', label: headingText };
      }
      if (combined.includes('return no') || combined.includes('debit note') || combined.includes('credit note')) {
        return { icon: '🔄', colour: 'orange', label: headingText };
      }
      if (combined.includes('date') || combined.includes('valid upto') || combined.includes('period')) {
        return { icon: '📅', colour: 'purple', label: headingText };
      }
      if (combined.includes('customer') || combined.includes('client')) {
        return { icon: '🏢', colour: 'blue', label: headingText };
      }
      if (combined.includes('supplier') || combined.includes('vendor')) {
        return { icon: '🏭', colour: 'indigo', label: headingText };
      }
      if (combined.includes('party')) {
        return { icon: '👥', colour: 'blue', label: headingText };
      }
      if (combined.includes('phone') || combined.includes('mobile') || combined.includes('contact')) {
        return { icon: '📞', colour: 'teal', label: headingText };
      }
      if (combined.includes('email') || combined.includes('mail')) {
        return { icon: '✉️', colour: 'email', label: headingText };
      }
      if (combined.includes('whatsapp') || combined.includes('whats app')) {
        return { icon: '💬', colour: 'whatsapp', label: headingText };
      }
      if (combined.includes('gstin') || combined.includes('tax no')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('place of supply') || combined.includes('pos') || combined.includes('state') || combined.includes('city') || combined.includes('address')) {
        return { icon: '📍', colour: 'pink', label: headingText };
      }
      if (combined.includes('item code') || combined.includes('sku') || combined.includes('part no')) {
        return { icon: '🔖', colour: 'indigo', label: headingText };
      }
      if (combined.includes('item') || combined.includes('product') || combined.includes('description') || combined.includes('goods')) {
        return { icon: '🏷️', colour: 'blue', label: headingText };
      }
      if (combined.includes('hsn') || combined.includes('sac')) {
        return { icon: '🔢', colour: 'indigo', label: headingText };
      }
      if (combined.includes('qty') || combined.includes('quantity') || combined.includes('stock')) {
        return { icon: '📦', colour: 'orange', label: headingText };
      }
      if (combined.includes('unit') || combined.includes('uom')) {
        return { icon: '📏', colour: 'teal', label: headingText };
      }
      if (combined.includes('rate') || combined.includes('price') || combined.includes('unit price')) {
        return { icon: '💲', colour: 'green', label: headingText };
      }
      if (combined.includes('discount')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('taxable') || combined.includes('tax value') || combined.includes('gst amount')) {
        return { icon: '🏷️', colour: 'orange', label: headingText };
      }
      if (combined.includes('paid amount') || combined.includes('received') || combined.includes('paid')) {
        return { icon: '💳', colour: 'green', label: headingText };
      }
      if (combined.includes('pending') || combined.includes('due amount') || combined.includes('balance')) {
        return { icon: '⏳', colour: 'yellow', label: headingText };
      }
      if (combined.includes('total') || combined.includes('grand total') || combined.includes('amount') || combined.includes('value') || combined.includes('net amount')) {
        return { icon: '💰', colour: 'green', label: headingText };
      }
      if (combined.includes('payment status') || combined.includes('payment due') || combined.includes('pay status')) {
        return { icon: '💳', colour: 'teal', label: headingText };
      }
      if (combined.includes('return status')) {
        return { icon: '🔄', colour: 'orange', label: headingText };
      }
      if (combined.includes('document status') || combined.includes('doc status') || combined.includes('status')) {
        return { icon: '🏷️', colour: 'purple', label: headingText };
      }
      if (combined.includes('actions') || combined.includes('action') || combined.includes('operations')) {
        return { icon: '⚙️', colour: 'purple', label: headingText };
      }
      if (combined.includes('salesperson') || combined.includes('agent') || combined.includes('rep')) {
        return { icon: '👔', colour: 'teal', label: headingText };
      }
      if (combined.includes('created by') || combined.includes('user') || combined.includes('author')) {
        return { icon: '👤', colour: 'teal', label: headingText };
      }
      if (combined.includes('transporter') || combined.includes('vehicle') || combined.includes('lr no')) {
        return { icon: '🚚', colour: 'orange', label: headingText };
      }
      if (combined.includes('bank') || combined.includes('account')) {
        return { icon: '🏦', colour: 'blue', label: headingText };
      }

      return { icon: '🏷️', colour: 'blue', label: headingText };
    },

    /**
     * Resolves status badge style and icon (matching Desktop SemanticTableCells.java)
     */
    statusSemantic(rawValue) {
      if (rawValue === null || rawValue === undefined) return null;
      const v = rawValue.toString().trim().toUpperCase();
      if (!v || v === '-' || v === 'N/A') return null;

      // SUCCESS (Green)
      if (v === 'APPROVED' || v === 'PAID' || v === 'SETTLED' || v === 'COMPLETE' || v === 'COMPLETED' ||
          v === 'ACTIVE' || v === 'SENT' || v === 'DELIVERED' || v === 'ACCEPTED' || v === 'CLOSED' ||
          v === 'POSTED' || v === 'IN STOCK' || v === 'VERIFIED' || v === 'MATCHED' || v === 'SUCCESS') {
        let icon = '✔';
        if (v === 'PAID') icon = '💳';
        if (v === 'SENT') icon = '✈';
        if (v === 'DELIVERED') icon = '📦';
        return { state: 'success', color: 'green', icon, text: v };
      }

      // DANGER / ERROR (Red)
      if (v === 'CANCELLED' || v === 'CANCELED' || v === 'REJECTED' || v === 'OVERDUE' || v === 'EXPIRED' ||
          v === 'INACTIVE' || v === 'FAILED' || v === 'ERROR' || v === 'DELETED' || v === 'OUT OF STOCK' ||
          v === 'LOCKED' || v === 'BLOCKED') {
        return { state: 'danger', color: 'red', icon: '✕', text: v };
      }

      // WARNING / PENDING (Amber)
      if (v === 'PENDING' || v === 'UNPAID' || v === 'OPEN' || v === 'DRAFT' || v === 'SOON' ||
          v === 'WAITING' || v === 'REVIEW' || v === 'NOT SENT' || v === 'UNSENT' || v === 'LOW STOCK' ||
          v === 'PARTIALLY_PAID' || v === 'PARTIAL' || v === 'IN PROGRESS') {
        let icon = '⏱';
        if (v.includes('PARTIAL')) icon = '◐';
        if (v === 'DRAFT') icon = '📝';
        if (v.includes('SENT')) icon = '✉';
        return { state: 'warning', color: 'yellow', icon, text: v };
      }

      // INFO / BLUE
      if (v === 'FULLY_RETURNED' || v === 'RETURNED' || v === 'RECONCILED' || v === 'IMPORTED' || v === 'PROCESSING') {
        return { state: 'info', color: 'blue', icon: '🔄', text: v };
      }

      // Default: Not a recognized status string - do not decorate
      return null;
    },

    /**
     * Resolves KPI Card icon and accent colour based on card title
     */
    kpiSemantic(label) {
      const text = normalize(label);
      if (text.includes('overdue') || text.includes('critical') || text.includes('rejected') || text.includes('cancel')) {
        return { icon: '⚠️', colour: 'red', glow: 'rgba(248, 113, 113, 0.25)' };
      }
      if (text.includes('today')) {
        return { icon: '📅', colour: 'green', glow: 'rgba(52, 211, 153, 0.25)' };
      }
      if (text.includes('reminder') || text.includes('follow up')) {
        return { icon: '⏰', colour: 'blue', glow: 'rgba(56, 189, 248, 0.25)' };
      }
      if (text.includes('next 7') || text.includes('upcoming') || text.includes('scheduled')) {
        return { icon: '🗓️', colour: 'purple', glow: 'rgba(167, 139, 250, 0.25)' };
      }
      if (text.includes('revenue') || text.includes('sales') || text.includes('collection') || text.includes('turnover')) {
        return { icon: '💰', colour: 'green', glow: 'rgba(52, 211, 153, 0.25)' };
      }
      if (text.includes('purchase') || text.includes('expense') || text.includes('spending')) {
        return { icon: '📦', colour: 'indigo', glow: 'rgba(129, 140, 248, 0.25)' };
      }
      if (text.includes('pending') || text.includes('due') || text.includes('receivable')) {
        return { icon: '⏳', colour: 'yellow', glow: 'rgba(251, 191, 36, 0.25)' };
      }
      if (text.includes('customer') || text.includes('client') || text.includes('party')) {
        return { icon: '👥', colour: 'blue', glow: 'rgba(56, 189, 248, 0.25)' };
      }
      if (text.includes('inventory') || text.includes('stock') || text.includes('sku') || text.includes('material')) {
        return { icon: '🏭', colour: 'orange', glow: 'rgba(251, 146, 60, 0.25)' };
      }
      if (text.includes('gst') || text.includes('tax') || text.includes('compliance')) {
        return { icon: '⚖️', colour: 'purple', glow: 'rgba(167, 139, 250, 0.25)' };
      }
      return { icon: '📊', colour: 'blue', glow: 'rgba(56, 189, 248, 0.25)' };
    },

    /**
     * Resolves form label icon based on label text or input id (412 desktop field mappings)
     */
    fieldSemantic(labelText, inputId) {
      function textKey(s) {
        if (!s) return '';
        let val = s.toString().toLowerCase().trim()
          .replace(/&amp;/g, ' and ')
          .replace(/&/g, ' and ')
          .replace(/₹/g, ' amount ')
          .replace(/↔/g, ' link ')
          .replace(/→/g, ' to ')
          .replace(/←/g, ' from ')
          .replace(/[*:]+$/g, '')
          .trim()
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return val;
      }

      // 1. Direct lookup in 412 desktop field inventory
      const key = textKey(labelText).replace(/\s+/g, '.');
      if (DESKTOP_FIELDS[key]) {
        const sem = DESKTOP_FIELDS[key];
        if (DESKTOP_SEMANTICS[sem] && DESKTOP_SEMANTICS[sem].icon) {
          return DESKTOP_SEMANTICS[sem].icon;
        }
      }

      // 2. Lookup inputId if provided
      if (inputId) {
        const idKey = textKey(inputId).replace(/\s+/g, '.');
        if (DESKTOP_FIELDS[idKey]) {
          const sem = DESKTOP_FIELDS[idKey];
          if (DESKTOP_SEMANTICS[sem] && DESKTOP_SEMANTICS[sem].icon) {
            return DESKTOP_SEMANTICS[sem].icon;
          }
        }
      }

      // 3. Fallback: fuzzy/semantic vocabulary match
      const text = normalize(labelText);
      const id = normalize(inputId);
      const combined = (text + ' ' + id).trim();

      if (combined.includes('customer') || combined.includes('client')) return '🏢';
      if (combined.includes('supplier') || combined.includes('vendor')) return '🏭';
      if (combined.includes('party')) return '👥';
      if (combined.includes('invoice') || combined.includes('bill no') || combined.includes('document')) return '📄';
      if (combined.includes('date')) return '📅';
      if (combined.includes('phone') || combined.includes('mobile')) return '📞';
      if (combined.includes('email')) return '✉️';
      if (combined.includes('password')) return '🔑';
      if (combined.includes('username') || combined.includes('user')) return '👤';
      if (combined.includes('address') || combined.includes('city') || combined.includes('state') || combined.includes('pincode')) return '📍';
      if (combined.includes('gstin') || combined.includes('tax')) return '🏷️';
      if (combined.includes('item') || combined.includes('sku') || combined.includes('product')) return '🏷️';
      if (combined.includes('hsn') || combined.includes('sac')) return '🔢';
      if (combined.includes('quantity') || combined.includes('qty')) return '📦';
      if (combined.includes('rate') || combined.includes('price')) return '💲';
      if (combined.includes('total') || combined.includes('amount')) return '💰';
      if (combined.includes('discount')) return '🏷️';
      if (combined.includes('transporter') || combined.includes('vehicle')) return '🚚';
      if (combined.includes('payment') || combined.includes('mode') || combined.includes('bank')) return '💳';
      if (combined.includes('notes') || combined.includes('remarks') || combined.includes('terms')) return '📝';
      if (combined.includes('department') || combined.includes('branch')) return '🌿';
      if (combined.includes('category')) return '📁';
      if (combined.includes('status')) return '🏷️';
      if (combined.includes('role')) return '🛡️';
      if (combined.includes('search')) return '🔍';
      return null;
    },

    /**
     * Resolves rich 3D label descriptor with icon, color theme, and CSS classes
     * (2027 Neon/Cyber Palette & Universal Fallback Parity)
     */
    resolveLabelDescriptor(labelText, inputId) {
      const rawText = (labelText || '').toString().toLowerCase().trim()
        .replace(/&amp;/g, ' and ')
        .replace(/&/g, ' and ')
        .replace(/[*:]+$/g, '')
        .trim();
      const rawId = (inputId || '').toString().toLowerCase().trim();
      const text = rawText + ' ' + rawId;

      // 1. Party / Entity
      if (/customer|client|buyer/.test(text)) {
        return { icon: '👤', colour: 'blue', themeClass: 'theme-blue', labelClass: 'erp-label-themed-blue' };
      }
      if (/supplier|vendor|seller/.test(text)) {
        return { icon: '🏭', colour: 'teal', themeClass: 'theme-teal', labelClass: 'erp-label-themed-teal' };
      }
      if (/party/.test(text)) {
        return { icon: '👥', colour: 'blue', themeClass: 'theme-blue', labelClass: 'erp-label-themed-blue' };
      }

      // 2. Identification / Document
      if (/invoice|bill(\s|$)|po(\s|\.|$)|order|quote|quotation|ref(\s|\.|$)|hsn|sac|sku|barcode|code/.test(text)) {
        return { icon: '🏷️', colour: 'cyan', themeClass: 'theme-cyan', labelClass: 'erp-label-themed-cyan' };
      }

      // 3. Finance & Currency
      if (/amount|rate|price|total|balance|discount|debit|credit|sub\s*total|taxable|charge|fee|gross|net/.test(text)) {
        return { icon: '💰', colour: 'green', themeClass: 'theme-green', labelClass: 'erp-label-themed-green' };
      }

      // 4. Date & Time
      if (/date|time|period|from\s*date|to\s*date|due|valid|schedule|calendar/.test(text)) {
        return { icon: '📅', colour: 'purple', themeClass: 'theme-purple', labelClass: 'erp-label-themed-purple' };
      }

      // 5. Taxation & Legal
      if (/gst|gstin|pan(\s|$)|tax|cgst|sgst|igst|vat|cess/.test(text)) {
        return { icon: '🏛️', colour: 'amber', themeClass: 'theme-amber', labelClass: 'erp-label-themed-amber' };
      }

      // 6. Location & Logistics
      if (/address|city|state|pincode|zip|country|location|warehouse/.test(text)) {
        return { icon: '📍', colour: 'pink', themeClass: 'theme-pink', labelClass: 'erp-label-themed-pink' };
      }
      if (/transport|vehicle|driver|lr(\s|\.|$)|eway|freight|delivery|dispatch|shipping/.test(text)) {
        return { icon: '🚚', colour: 'orange', themeClass: 'theme-orange', labelClass: 'erp-label-themed-orange' };
      }

      // 7. Communication
      if (/whatsapp/.test(text)) {
        return { icon: '💬', colour: 'matrix', themeClass: 'theme-matrix', labelClass: 'erp-label-themed-matrix' };
      }
      if (/email|mail/.test(text)) {
        return { icon: '✉️', colour: 'cyan', themeClass: 'theme-cyan', labelClass: 'erp-label-themed-cyan' };
      }
      if (/mobile|phone|contact|tel/.test(text)) {
        return { icon: '📞', colour: 'teal', themeClass: 'theme-teal', labelClass: 'erp-label-themed-teal' };
      }

      // 8. Notes, Remarks & Attachments
      if (/attachment|document|file|upload|bill\s*copy|receipt/.test(text)) {
        return { icon: '📎', colour: 'purple', themeClass: 'theme-purple', labelClass: 'erp-label-themed-purple' };
      }
      if (/note|notes|remark|description|terms|narration|comment/.test(text)) {
        return { icon: '📝', colour: 'purple', themeClass: 'theme-purple', labelClass: 'erp-label-themed-purple' };
      }

      // 9. Status & Workflow
      if (/status|type|category|mode|active|payment\s*terms|unit/.test(text)) {
        return { icon: '⚡', colour: 'amber', themeClass: 'theme-amber', labelClass: 'erp-label-themed-amber' };
      }

      // 10. Security & Access
      if (/password|pin|security|mfa|otp|captcha|auth/.test(text)) {
        return { icon: '🔑', colour: 'pink', themeClass: 'theme-pink', labelClass: 'erp-label-themed-pink' };
      }
      if (/user|username|role|permission|profile|designation/.test(text)) {
        return { icon: '👤', colour: 'teal', themeClass: 'theme-teal', labelClass: 'erp-label-themed-teal' };
      }

      // Universal Safe Fallback Rule (Guarantee 100% labels styled)
      return { icon: '📌', colour: 'neutral', themeClass: 'theme-neutral', labelClass: 'erp-label-themed-neutral' };
    }
  };
})();

