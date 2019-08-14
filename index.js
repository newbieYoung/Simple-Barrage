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
    window.requestAnimFrame = (function() {
        return window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.webkitRequestAnimationFrame;
    })();

    var transformProperty = Prefix.prefix('transform');

    //常用方法名简化
    function on (el, evt, callback) {
        el.addEventListener(evt, callback);
    }
    function off (el, evt, callback) {
        el.removeEventListener(evt, callback);
    }
    function qs (str) {
        return document.querySelector(str);
    }
    function qsa (str) {
        return document.querySelectorAll(str);
    }

    /**
     * $container 弹幕容器
     * lineNum 弹幕行数
     * eleHeight 弹幕元素高度
     * newItem 构造单条弹幕函数
     */
    function SimpleBarrage(config) {
        if (!config || typeof (config) !== 'object') {
            console.error('参数异常');
            return;
        }

        this.lineNum = config.lineNum || 1;
        this.newItem = config.newItem || function(){};
        this.$container = config.$container;
        this.eleHeight = config.eleHeight || 0;
        this.gapWidth = config.gapWidth || 0;

        this._containerRect = this.$container.getBoundingClientRect();
        this._lineHeight = this._containerRect.height / this.lineNum;//弹幕行高度 = 总区域高度 / 行数
        this._itemClass = 'barrage-item';
        this._lineClass = 'barrage-line';
    };

    //添加新的弹幕块
    SimpleBarrage.prototype.newBlock = function(list){
        var $item = document.createElement('div');
        $item.classList.add(this._itemClass);

        //初始化
        var lens = [];
        var eles = [];
        for(var i=0;i<this.lineNum;i++){
            lens.push(0);
            eles.push([]);
        }

        //生成弹幕元素
        var items = [];
        for(var i=0;i<list.length;i++){
            var data = list[i];
            items.push(this.newItem(data));
        }

        //按长度倒序
        items.sort(function(a,b){
            if (a.len < b.len ) {
                return 1;
            }
            if (a.len > b.len ) {
                return -1;
            }
            return 0;
        });

        //拆分弹幕
        for(var i=0;i<items.length;i++){
            var cur = _min(lens);
            var item = items[i];
            this.randomStatus(item.ele);
            lens[cur.index] += item.len;
            eles[cur.index].push(item.ele);
        }

        //构造元素
        var $fragment = document.createDocumentFragment();
        for(var i=0;i<this.lineNum;i++){
            var $line = document.createElement('ul');
            $line.classList.add(this._lineClass);
            for(var j=0;j<eles[i].length;j++){
                var $li = document.createElement('li');
                $li.appendChild(eles[i][j]);
                $line.appendChild($li);
            }
            $fragment.appendChild($line);
        }
        $item.appendChild($fragment);
        $item.style.setProperty('--lineHeight',this._lineHeight+'px');
        $item.style.setProperty('--lineOffset',(this._lineHeight - this.eleHeight)/2+'px');
        $item.style.setProperty('--gapWidth',this.gapWidth+'px');

        this.$container.appendChild($item);
    }

    //弹幕元素随机状态
    SimpleBarrage.prototype.randomStatus = function($ele){
        var translateX = (Math.random()-0.5)*this.gapWidth;
        var translateY = (Math.random()-0.5)*this.gapWidth;
        var minScale = 0.8;
        var maxScale = 1.2;
        var scale = 1+(Math.random()-0.5)*(maxScale-minScale)*Math.max(Math.abs(translateX),Math.abs(translateY))/(this.gapWidth/2)/* 偏移越多，允许缩放的范围越大 */
        $ele.style[transformProperty] = 'translateX('+translateX+'px) translateY('+translateY+'px) scale('+scale+')';
    }

    //获取数组中的最小值
    function _min(arr){
        var min = {
            index : 0,
            value : arr[0]
        }
        for(var i=1;i<arr.length;i++){
            if(arr[i]<min.value){
                min.index = i;
                min.value = arr[i];
            }
        }
        return min;
    }

    return SimpleBarrage;
}));

