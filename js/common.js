/* ==========================================================================
 * 渭南师范学院新生被褥预定平台 - 公共业务逻辑
 * 全局命名空间 WNU（WeiNan Normal University）
 * 职责：
 *   1. 加载 products.json 数据
 *   2. 顶部公告栏滚动渲染
 *   3. 我的订单查询入口链接
 *   4. 首页渲染（主卡片+款式预览）
 *   5. 详情页渲染：规格/视频缩略图、阶梯定价、折叠展开、立即预定
 * ========================================================================== */

(function (global) {
    'use strict';

    // ---- 全局状态 ----
    var DATA = null;           // products.json 缓存
    var CUR_SKU_IDX = 0;       // 当前选中 SKU 下标
    var CUR_QTY = 1;           // 当前数量

    // ---- 工具函数 ----
    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function $all(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    /**
     * 加载 JSON 数据（带缓存）
     */
    function loadData() {
        if (DATA) return Promise.resolve(DATA);
        return fetch('data/products.json', { cache: 'no-cache' })
            .then(function (r) {
                if (!r.ok) throw new Error('products.json 加载失败: ' + r.status);
                return r.json();
            })
            .then(function (json) {
                DATA = json;
                return DATA;
            });
    }

    /* ---- 公告栏渲染：多文案循环滚动 ---- */
    function renderAnnouncement(msgs) {
        var box = $('#announcementText');
        if (!box || !msgs || !msgs.length) return;
        // 用 " · " 连接后重复 3 次，实现流畅的横向无缝滚动
        var text = msgs.join('          ·          ');
        box.textContent = text + '          ·          ' + text + '          ·          ' + text;
    }

    /* ---- 查询入口链接 ---- */
    function bindQueryEntryLink(queryViewUrl) {
        var a = $('#queryEntryLink');
        if (a && queryViewUrl) {
            a.href = queryViewUrl;
        }
    }

    /* ---- 客服联系方式渲染：空值不显示 ---- */
    function renderContact(contact) {
        var block = $('#detailContact');
        var wrap = $('#contactItems');
        if (!block || !wrap) return; // 详情页才有
        var hasAny = false;
        wrap.innerHTML = '';

        if (contact && contact.wechat && String(contact.wechat).trim()) {
            hasAny = true;
            var wc = document.createElement('div');
            wc.className = 'contact-chip wechat';
            wc.innerHTML =
                '<i class="fab fa-weixin"></i> 微信号：' +
                '<span>' + String(contact.wechat).trim() + '</span>';
            wc.title = '点击复制微信号';
            wc.addEventListener('click', function () {
                copyText(String(contact.wechat).trim(), wc);
            });
            wrap.appendChild(wc);
        }

        if (contact && contact.phone && String(contact.phone).trim()) {
            hasAny = true;
            var ph = document.createElement('div');
            ph.className = 'contact-chip phone';
            ph.innerHTML =
                '<i class="fas fa-phone"></i> 电话：' +
                '<span>' + String(contact.phone).trim() + '</span>';
            ph.title = '点击拨打电话';
            ph.addEventListener('click', function () {
                // 移动端直接拨号
                window.location.href = 'tel:' + String(contact.phone).trim();
            });
            wrap.appendChild(ph);
        }

        if (hasAny) block.style.display = '';
    }

    /* ---- 复制文本 ---- */
    function copyText(text, el) {
        var done = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    markCopied(el);
                });
                done = true;
            }
        } catch (e) {}
        if (!done) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                markCopied(el);
            } catch (e) {}
            document.body.removeChild(ta);
        }
    }

    function markCopied(el) {
        if (!el) return;
        var originHTML = el.innerHTML;
        el.innerHTML = '<i class="fas fa-check"></i> 已复制';
        el.classList.add('copied');
        setTimeout(function () {
            el.innerHTML = originHTML;
            el.classList.remove('copied');
        }, 1500);
    }

    /* ---- 首页渲染 ---- */
    function initHomePage() {
        loadData()
            .then(function (d) {
                var p = d.product;

                // 公告栏
                renderAnnouncement(p.announcement);

                // 查询入口
                bindQueryEntryLink(p.forms && p.forms.queryView);

                // 主卡片：标题/描述/封面/价格/已售/库存
                if (p.name) setText('homeProductTitle', p.name);
                if (p.description) setText('homeProductDesc', p.description);
                if (p.skus && p.skus[0]) setAttr('homeCoverImg', 'src', p.skus[0].cover);

                var price = p.pricing || {};
                setText('homeGroupPrice', price.groupPrice || 399);
                setText('homeSinglePrice', price.singlePrice || 450);

                setText('homeSold', p.sold || 0);
                setText('homeStock', p.stock || 0);

                // 款式快速预览
                setText('homeSkuCount', (p.skus && p.skus.length) || 0);
                renderHomeSkus(p.skus);

                // 页脚联系方式
                if (p.contact) {
                    if (p.contact.phone) setText('footerPhone', p.contact.phone);
                    if (p.contact.wechat) setText('footerWechat', p.contact.wechat);
                }
            })
            .catch(function (e) {
                console.error('首页初始化失败：', e);
                alert('商品数据加载失败，请刷新重试。若仍不行，检查 data/products.json 是否存在且路径正确。');
            });
    }

    function renderHomeSkus(skus) {
        var grid = $('#homeSkuGrid');
        if (!grid || !skus || !skus.length) return;
        grid.innerHTML = '';
        skus.forEach(function (sku, idx) {
            var el = document.createElement('a');
            el.className = 'home-sku-item';
            el.href = 'detail.html#sku=' + idx;
            el.innerHTML =
                '<img class="home-sku-item-img" src="' +
                sku.cover +
                '" alt="' +
                sku.name +
                '">' +
                '<div class="home-sku-item-name">' +
                sku.name +
                '</div>';
            grid.appendChild(el);
        });
    }

    /* ---- 详情页渲染 ---- */
    function initDetailPage() {
        loadData()
            .then(function (d) {
                var p = d.product;

                // 公告栏 & 查询入口
                renderAnnouncement(p.announcement);
                bindQueryEntryLink(p.forms && p.forms.queryView);

                // 基础信息
                if (p.name) setText('detailTitle', p.name);
                if (p.description) setText('detailDesc', p.description);
                setText('detailSold', p.sold || 0);
                setText('detailStock', p.stock || 0);

                // 数量 max
                var qtyInput = $('#qtyInput');
                if (qtyInput) qtyInput.setAttribute('max', p.maxQuantity || 5);

                // 微信收款码 + 提示
                if (p.payment) {
                    if (p.payment.qrcode) setAttr('paymentQrcodeImg', 'src', p.payment.qrcode);
                    if (p.payment.tip) setText('paymentTipSub', p.payment.tip);
                }

                // 商品参数表
                renderParams(p.params);

                // 客服联系
                renderContact(p.contact);

                // 渲染媒体缩略图（规格图 + 3个视频）
                var skus = p.skus || [];
                setText('skuPickerCount', skus.length);
                renderMediaThumbs(skus, p.videos || []);
                renderSkuPickerGrid(skus);

                // 默认选中第一个 SKU（如 URL 带 sku=index 则按 hash 选中）
                var startIdx = 0;
                try {
                    var m = (window.location.hash || '').match(/sku=(\d+)/);
                    if (m) startIdx = Math.max(0, Math.min(skus.length - 1, parseInt(m[1], 10) || 0));
                } catch (e) {}
                selectSku(startIdx, skus);

                // 初始化数量 & 价格
                updateQuantityAndPrice(CUR_QTY, p);

                // 绑定交互
                bindDetailInteractions(p);
            })
            .catch(function (e) {
                console.error('详情页初始化失败：', e);
                alert('商品数据加载失败，请刷新重试。若仍不行，检查 data/products.json 是否存在且路径正确。');
            });
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function setAttr(id, attr, value) {
        var el = document.getElementById(id);
        if (el) el.setAttribute(attr, value);
    }

    /* ---- 参数表渲染 ---- */
    function renderParams(params) {
        var tbody = $('#paramsTable tbody');
        if (!tbody || !params) return;
        tbody.innerHTML = '';
        Object.keys(params).forEach(function (key) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<th>' + key + '</th><td>' + String(params[key]) + '</td>';
            tbody.appendChild(tr);
        });
    }

    /* ---- 主视觉缩略图行：规格图(首图) + 3个视频 ---- */
    function renderMediaThumbs(skus, videos) {
        var row = $('#thumbsRow');
        if (!row) return;
        row.innerHTML = '';

        // 1. 第一个 SKU 的封面（后面切 SKU 时会重设 active）
        var firstImg = document.createElement('div');
        firstImg.className = 'detail-thumb-item active media-thumb-img';
        firstImg.setAttribute('data-type', 'image');
        firstImg.setAttribute('data-idx', '0');
        firstImg.innerHTML =
            '<img src="' + (skus[0] ? skus[0].cover : '') + '" alt="">' +
            '<span class="detail-thumb-label">款式</span>';
        row.appendChild(firstImg);

        // 2. 其他规格图片
        for (var i = 1; i < skus.length; i++) {
            (function (idx) {
                var item = document.createElement('div');
                item.className = 'detail-thumb-item media-thumb-img';
                item.setAttribute('data-type', 'image');
                item.setAttribute('data-idx', String(idx));
                item.innerHTML =
                    '<img src="' + skus[idx].cover + '" alt="">' +
                    '<span class="detail-thumb-label">' + skus[idx].name + '</span>';
                row.appendChild(item);
            })(i);
        }

        // 3. 3 个统一视频
        videos.forEach(function (v, idx) {
            var vt = document.createElement('div');
            vt.className = 'detail-thumb-item video-thumb';
            vt.setAttribute('data-type', 'video');
            vt.setAttribute('data-video-idx', String(idx));
            vt.innerHTML =
                '<img src="' + (v.cover || '') + '" alt="">' +
                '<span class="detail-thumb-label">' + (v.title || ('视频' + (idx + 1))) + '</span>';
            row.appendChild(vt);
        });

        // 点击缩略图切换
        $all('.detail-thumb-item', row).forEach(function (el) {
            el.addEventListener('click', function () {
                var type = el.getAttribute('data-type');
                $all('.detail-thumb-item', row).forEach(function (x) { x.classList.remove('active'); });
                el.classList.add('active');

                var vImg = $('#mainVisualImg');
                var vVideo = $('#mainVisualVideo');
                var mask = $('#videoPlayMask');

                if (type === 'image') {
                    var idx = parseInt(el.getAttribute('data-idx') || '0', 10);
                    var sku = skus[idx];
                    if (sku) {
                        vImg.setAttribute('src', sku.cover);
                        vImg.style.display = '';
                        vVideo.style.display = 'none';
                        vVideo.pause();
                        vVideo.removeAttribute('src');
                        mask.style.display = 'none';
                        selectSku(idx, skus);
                    }
                } else if (type === 'video') {
                    var vIdx = parseInt(el.getAttribute('data-video-idx') || '0', 10);
                    var vObj = videos[vIdx];
                    if (vObj) {
                        vImg.style.display = 'none';
                        vVideo.style.display = '';
                        // B站 / 腾讯视频：给占位海报 + 点击遮罩跳转播放
                        // 视频链接如果是第三方播放页，则不设置 src，而是点击后打开新页
                        var directExt = /\.(mp4|webm|ogg)$/i.test(vObj.url || '');
                        if (directExt) {
                            vVideo.setAttribute('src', vObj.url);
                            mask.style.display = '';
                            vVideo.pause();
                            vVideo.load();
                        } else {
                            // 第三方视频：用封面当图，点跳转
                            vVideo.style.display = 'none';
                            vImg.style.display = '';
                            vImg.setAttribute('src', vObj.cover || '');
                            mask.style.display = '';
                            vImg.dataset.extVideoUrl = vObj.url;
                        }
                    }
                }
            });
        });

        // 视频播放遮罩点击
        var mask = $('#videoPlayMask');
        if (mask) {
            mask.addEventListener('click', function () {
                var vImg = $('#mainVisualImg');
                var vVideo = $('#mainVisualVideo');
                var ext = vImg && vImg.dataset && vImg.dataset.extVideoUrl;
                if (ext) {
                    window.open(ext, '_blank', 'noopener');
                    return;
                }
                if (vVideo && vVideo.style.display !== 'none') {
                    mask.style.display = 'none';
                    vVideo.play().catch(function () {});
                }
            });
        }
    }

    /* ---- 规格缩略图网格（折叠展开） ---- */
    function renderSkuPickerGrid(skus) {
        var grid = $('#skuPickerGrid');
        if (!grid) return;
        grid.innerHTML = '';
        skus.forEach(function (sku, idx) {
            var card = document.createElement('div');
            card.className = 'sku-card';
            card.setAttribute('data-sku-idx', String(idx));
            card.innerHTML =
                '<img class="sku-card-img" src="' + sku.cover + '" alt="' + sku.name + '">' +
                '<div class="sku-card-name">' + sku.name + '</div>';
            card.addEventListener('click', function () {
                selectSku(idx, skus);
            });
            grid.appendChild(card);
        });

        // 折叠展开
        var btn = $('#skuExpandBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                var isExp = grid.classList.toggle('expanded');
                btn.classList.toggle('expanded', isExp);
                var span = btn.querySelector('span');
                if (span) span.textContent = isExp ? '收起款式' : '查看全部款式';
            });
            // 如果总款式 ≤ 6，自动隐藏展开按钮
            if (skus.length <= 6) {
                grid.classList.add('expanded');
                btn.style.display = 'none';
            }
        }
    }

    /* ---- 选中某个 SKU ---- */
    function selectSku(idx, skus) {
        if (!skus || !skus[idx]) return;
        CUR_SKU_IDX = idx;
        var sku = skus[idx];

        setText('selectedSkuName', sku.name);

        // 选择卡片激活
        $all('.sku-card').forEach(function (el) {
            var i = parseInt(el.getAttribute('data-sku-idx') || '-1', 10);
            el.classList.toggle('active', i === idx);
        });

        // 媒体缩略图行切换到对应 image
        var media = $all('.detail-thumb-item.media-thumb-img');
        media.forEach(function (el) {
            var i = parseInt(el.getAttribute('data-idx') || '-1', 10);
            el.classList.toggle('active', i === idx);
        });

        // 主视觉也换图
        var vImg = $('#mainVisualImg');
        var vVideo = $('#mainVisualVideo');
        var mask = $('#videoPlayMask');
        if (vImg) {
            vImg.setAttribute('src', sku.cover);
            vImg.style.display = '';
            vImg.removeAttribute('data-ext-video-url');
        }
        if (vVideo) {
            vVideo.style.display = 'none';
            vVideo.pause();
            vVideo.removeAttribute('src');
        }
        if (mask) mask.style.display = 'none';
    }

    /* ---- 阶梯定价计算 & 更新 UI ---- */
    function updateQuantityAndPrice(qty, p) {
        var price = p.pricing || { singlePrice: 450, groupPrice: 399, groupThreshold: 2 };
        var single = +price.singlePrice || 0;
        var group = +price.groupPrice || 0;
        var threshold = +price.groupThreshold || 2;

        var unitPrice = qty >= threshold ? group : single;
        var total = qty * unitPrice;
        var standard = qty * single;
        var saved = standard - total;

        CUR_QTY = qty;

        // 价格显示
        setText('detailUnitPrice', unitPrice);
        setText('detailTotal', total);
        setText('bottomTotal', total);
        setText('bottomQty', qty);

        // 提示文案
        var hint = $('#detailPriceHint');
        if (hint) {
            if (qty >= threshold) {
                hint.textContent = '已享团购价（≥2 套 399 元/套）';
                hint.classList.add('group');
            } else {
                hint.textContent = '买 ' + threshold + ' 套起，享团购价 ' + group + ' 元/套';
                hint.classList.remove('group');
            }
        }

        // 已省
        var saveTip = $('#totalSaveTip');
        if (saveTip) {
            if (saved > 0) {
                saveTip.style.display = '';
                setText('detailSaved', saved);
            } else {
                saveTip.style.display = 'none';
            }
        }

        // 数量输入框 & 按钮状态
        var qtyInput = $('#qtyInput');
        if (qtyInput) qtyInput.value = qty;
        var maxQty = +(p.maxQuantity || 5);
        var minusBtn = $('#qtyMinus');
        var plusBtn = $('#qtyPlus');
        if (minusBtn) minusBtn.disabled = qty <= 1;
        if (plusBtn) plusBtn.disabled = qty >= maxQty;
    }

    /* ---- 详情页事件绑定 ---- */
    function bindDetailInteractions(p) {
        var maxQty = +(p.maxQuantity || 5);

        $('#qtyMinus') && $('#qtyMinus').addEventListener('click', function () {
            if (CUR_QTY > 1) updateQuantityAndPrice(CUR_QTY - 1, p);
        });
        $('#qtyPlus') && $('#qtyPlus').addEventListener('click', function () {
            if (CUR_QTY < maxQty) updateQuantityAndPrice(CUR_QTY + 1, p);
        });
        var qtyInput = $('#qtyInput');
        if (qtyInput) {
            qtyInput.addEventListener('change', function () {
                var v = parseInt(qtyInput.value, 10);
                if (isNaN(v) || v < 1) v = 1;
                if (v > maxQty) v = maxQty;
                updateQuantityAndPrice(v, p);
            });
        }

        // 立即预定按钮：滚动到付款区域
        var bookBtn = $('#bookNowBtn');
        if (bookBtn) {
            bookBtn.addEventListener('click', function () {
                scrollToPaymentSection();
            });
        }

        // 我已完成支付按钮：跳转到金数据表单
        var paidDoneBtn = $('#paidDoneBtn');
        if (paidDoneBtn) {
            paidDoneBtn.addEventListener('click', function () {
                handleBookNow(p);
            });
        }
    }

    /* ---- 滚动到付款区域 ---- */
    function scrollToPaymentSection() {
        var section = document.getElementById('paymentSection');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /* ---- 立即预定：跳转到金数据表单 ---- */
    function handleBookNow(p) {
        if (!p.forms || !p.forms.orderForm) {
            alert('老板暂未配置金数据表单链接，请稍后再试。');
            return;
        }
        goToOrderForm(p.forms.orderForm);
    }

    /**
     * 跳转到金数据表单（不预填，用户在表单里重新选款式和数量）
     */
    function goToOrderForm(baseUrl) {
        if (!baseUrl) return;
        window.open(baseUrl, '_blank', 'noopener');
    }

    function getCurrentTotal() {
        var p = DATA && DATA.product;
        if (!p) return 0;
        var price = p.pricing || {};
        var single = +price.singlePrice || 0;
        var group = +price.groupPrice || 0;
        var threshold = +price.groupThreshold || 2;
        var unit = CUR_QTY >= threshold ? group : single;
        return CUR_QTY * unit;
    }

    // ---- 对外接口 ----
    global.WNU = {
        initHomePage: initHomePage,
        initDetailPage: initDetailPage,
        loadData: loadData,
        getState: function () {
            return {
                DATA: DATA,
                CUR_SKU_IDX: CUR_SKU_IDX,
                CUR_QTY: CUR_QTY
            };
        }
    };
})(window);
