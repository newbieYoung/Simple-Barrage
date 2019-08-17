/**
 * Created by newyoung on 2019/8/14.
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['prefix-umd'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = factory(require('prefix-umd'));
    } else {
        // Browser globals
        window.SimpleBarrage = factory(window.Prefix);
    }
}(function (Prefix) {
    //兼容性处理
    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.webkitRequestAnimationFrame;
    })();

    var transformProperty = Prefix.prefix('transform');

    //常用方法名简化
    function on(el, evt, callback) {
        el.addEventListener(evt, callback);
    }

    function off(el, evt, callback) {
        el.removeEventListener(evt, callback);
    }

    function qs(str) {
        return document.querySelector(str);
    }

    function qsa(str) {
        return document.querySelectorAll(str);
    }

    /**
     * $container 弹幕容器
     * lineNum 弹幕行数
     * eleHeight 弹幕元素高度
     * gapWidth 弹幕元素水平间距
     * isLoop 是否循环播放
     * speed 弹幕块移动速度
     * scaleLen 弹幕元素缩放系数
     * newItem 构造单条弹幕函数
     */
    function SimpleBarrage(config) {
        if (!config || typeof (config) !== 'object') {
            console.error('参数异常');
            return;
        }

        this.lineNum = config.lineNum || 1;
        this.newItem = config.newItem || function () {};
        this.$container = config.$container;
        this.eleHeight = config.eleHeight || 0;
        this.gapWidth = config.gapWidth || 0;
        this.speed = config.speed || 100;
        this.isLoop = config.isLoop || false;
        this.scaleLen = config.scaleLen || 0.1;

        this._containerRect = this.$container.getBoundingClientRect();
        this._lineHeight = this._containerRect.height / this.lineNum; //弹幕行高度 = 总区域高度 / 行数
        this._lineOffset = (this._lineHeight - this.eleHeight) / 2; //让每行弹幕垂直居中时需要的偏移
        this._itemClass = 'barrage-item';
        this._lineClass = 'barrage-line';
        this._curBlock = null; //当前展示的弹幕块
        this._waitingBlocks = []; //等待展示的弹幕块
    }

    //添加新的弹幕块
    SimpleBarrage.prototype.newBlock = function (list) {
        var $item = document.createElement('div');
        $item.classList.add(this._itemClass);

        //初始化
        var lens = [];
        var eles = [];
        for (var i = 0; i < this.lineNum; i++) {
            lens.push(0);
            eles.push([]);
        }

        //生成弹幕元素
        var items = [];
        for (var i = 0; i < list.length; i++) {
            var data = list[i];
            items.push(this.newItem(data));
        }

        //按长度倒序
        items.sort(function (a, b) {
            if (a.len < b.len) {
                return 1;
            }
            if (a.len > b.len) {
                return -1;
            }
            return 0;
        });

        //拆分弹幕
        for (var i = 0; i < items.length; i++) {
            var cur = _min(lens);
            var item = items[i];
            item.ele.style.marginLeft = '0px';
            lens[cur.index] += item.len;
            eles[cur.index].push(item.ele);
            item.position = { //记录位置在几行几列
                line: cur.index,
                column: eles[cur.index].length - 1
            }
        }

        //构造元素
        var $fragment = document.createDocumentFragment();
        var lines = [];
        for (var i = 0; i < this.lineNum; i++) {
            var $line = document.createElement('ul');
            $line.classList.add(this._lineClass);
            for (var j = 0; j < eles[i].length; j++) {
                var $li = document.createElement('li');
                $li.appendChild(eles[i][j]);
                $line.appendChild($li);
            }
            $fragment.appendChild($line);
            lines.push($line);
        }
        $item.appendChild($fragment);
        $item.style.setProperty('--lineHeight', this._lineHeight + 'px');
        $item.style.setProperty('--lineOffset', this._lineOffset + 'px');
        $item.style.setProperty('--gapWidth', this.gapWidth + 'px');
        $item._moveX = this._containerRect.width + this.gapWidth;
        //$item.style[transformProperty] = 'translateX(' + $item._moveX + 'px) translateZ(0)'; //设置起始位置
        this.$container.appendChild($item);
        this._waitingBlocks.push($item);

        //记录相关信息
        $item._lines = lines;
        $item._items = items;
        $item._lens = lens;
        $item._eles = eles;
        this.randomPosition($item);
    }

    //开始播放弹幕
    SimpleBarrage.prototype.play = function () {
        var self = this;

        if (!self._curBlock) {
            self._curBlock = self._waitingBlocks[0];
            self._waitingBlocks.shift();
        }
        if (self._curBlock) {
            window.requestAnimFrame(function (timestamp) {
                self.moving(timestamp, timestamp, self._curBlock);
            });
        }
    }

    //弹幕移动
    SimpleBarrage.prototype.moving = function (curstamp, laststamp, $item) {
        var self = this;
        if (self._status == 'pause') {
            return;
        }

        var rect = $item.getBoundingClientRect();
        var moveX = self.speed * (curstamp - laststamp) / 1000;
        $item._moveX -= moveX;
        $item.style[transformProperty] = 'translateX(' + $item._moveX + 'px) translateZ(0)';

        var nextMoveX = -(rect.width - self._containerRect.width + self.gapWidth);
        var endMoveX = -(rect.width + self.gapWidth);

        if ($item._moveX <= nextMoveX && self._curBlock == $item) {
            self._curBlock = null;
            self.play();
        }

        if ($item._moveX >= endMoveX) {
            window.requestAnimFrame(function (timestamp) {
                self.moving(timestamp, curstamp, $item);
            });
        } else {
            self.resetBlock($item);
        }
    }

    //弹幕块中加入元素
    SimpleBarrage.prototype.addItem = function (data) {
        if (this._curBlock) {
            var item = this.newItem(data);
            this._curBlock._items.push(item);
            var rects = [];
            for (var i = 0; i < this._curBlock._lines.length; i++) {
                rects.push(this._curBlock._lines[i].getBoundingClientRect());
            }

            //找到最短行
            var shortLine = 0;
            var shortLen = rects[0].width;
            for (var i = 1; i < rects.length; i++) {
                if (shortLen > rects[i].width) {
                    shortLine = i;
                    shortLen = rects[i].width;
                }
            }

            //计算偏移
            var offsetLeft = this._containerRect.width - (rects[shortLine].x + rects[shortLine].width);
            if (offsetLeft > 0) {
                item.ele.style.marginLeft = offsetLeft + 'px';
            }

            var $li = document.createElement('li');
            $li.appendChild(item.ele);
            this._curBlock._lines[shortLine].appendChild($li);
        }
    }

    //暂停
    SimpleBarrage.prototype.pause = function () {
        this._status = 'pause';
    }

    //重置弹幕块
    SimpleBarrage.prototype.resetBlock = function ($item) {
        $item._moveX = this._containerRect.width + this.gapWidth;
        $item.style[transformProperty] = 'translateX(' + $item._moveX + 'px) translateZ(0)'; //设置起始位置
        if (this.isLoop) {
            this._waitingBlocks.push($item);
        }

        for (var i = 0; i < $item._items.length; i++) {
            $item._items[i].ele.style.marginLeft = '0px';
        }
    }

    //弹幕块元素随机分布
    SimpleBarrage.prototype.randomPosition = function ($block) {
        console.log($block._lines);
        console.log($block._items);
        console.log($block._lens);
        console.log($block._eles);

        //记录序号
        var arr = [];
        for (var i = 0; i < $block._items.length; i++) {
            arr.push(i);
        }

        //随机选取一个元素
        var no = parseInt(Math.random() * arr.length);


    }

    //某个元素随机移动
    SimpleBarrage.prototype.randomMoving = function ($block, no) {
        var $ele = $block._items[no];
        $ele._moveX = $ele._moveX || 0;
        $ele._moveY = $ele._moveY || 0;
        $ele._scale = $ele._scale || 1;
        var rect = $ele.getBoundingClientRect();

        //计算垂直距离
        var verticalLen = null;
        //上一行元素
        var topLen = null;
        var topLine = $block._eles[$ele.line - 1];
        if (topLine) {
            for (var i = 0; i < topLine.length; i++) {
                var topRect = topLine[i].getBoundingClientRect();
                if ((topRect.left < rect.right && topRect.right > rect.right) ||
                    (topRect.left < rect.left && topRect.right > rect.left)) {
                    if (topLen == null || topLen > (topRect.bottom - rect.top)) {
                        topLen = (topRect.bottom - rect.top);
                    }
                }
            }
        }
        //下一行元素
        var botLen = null;
        var bottomLine = $block._eles[$ele.line + 1];
        if (bottomLine) {
            for (var i = 0; i < bottomLine.length; i++) {
                var botRect = bottomLine[i].getBoundingClientRect();
                if ((botRect.left < rect.right && botRect.right > rect.right) ||
                    (botRect.left < rect.left && botRect.right > rect.left)) {
                    if (botLen == null || bottomLine > (botRect.top - rect.bottom)) {
                        botLen = (botRect.top - rect.bottom);
                    }
                }
            }
        }
        //上下居中
        if (topLen != null && botLen != null) {
            $ele._moveY += (botLen - topLen) / 2;
            verticalLen = (botLen + topLen) / 2
        } else {
            verticalLen = botLen || topLen; //上下距离至少有一个不为空
        }

        //计算水平距离
        var horizontalLen = null;
        //左侧元素
        var leftLen = null;
        var left = {
            line: $ele.position.line,
            column: $ele.position.column - 1
        }
        var $left = $block._eles[left.line][left.column];
        if ($left) {
            var leftRect = $left.getBoundingClientRect();
            leftLen = rect.left - (leftRect.left + left.width);
        }
        //右侧元素
        var rightLen = null;
        var right = {
            line: $ele.position.line,
            column: $ele.position.column + 1
        }
        var $right = $block._eles[right.line][right.column];
        if ($right) {
            var rightRect = $right.getBoundingClientRect();
            rightLen = rightRect.left - (rect.left + rect.width)
        }
        //左右居中
        if (rightLen != null && leftLen != null) {
            $ele._moveX += (rightLen - leftLen) / 2;
            horizontalLen = (rightLen + leftLen) / 2
        } else {
            horizontalLen = leftLen || rightLen; //左右距离至少有一个不为空
        }

        //水平缩放
        var hScale = 1 + Math.random() * this.scaleLen * horizontalLen / this.gapWidth;
        //垂直缩放
        var vScale = 1 + Math.random() * this.scaleLen * verticalLen / this._lineHeight / 2;
        var scale = hScale > vScale ? vScale : hScale;
        $ele._scale *= scale;


    }

    //获取数组中的最小值
    function _min(arr) {
        var min = {
            index: 0,
            value: arr[0]
        }
        for (var i = 1; i < arr.length; i++) {
            if (arr[i] < min.value) {
                min.index = i;
                min.value = arr[i];
            }
        }
        return min;
    }

    return SimpleBarrage;
}));