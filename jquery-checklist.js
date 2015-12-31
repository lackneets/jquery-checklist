/* 
    jquery-Checklist v 0.1.0 - an simple checklist in dropdown
        2014 Lackneets Chang 

        lackneets@gmail.com
        lackneets.tw
 */

(function($) {

    function fieldMagic(object, path, result) {
        path = path || '';
        result = result || [];
        if (object instanceof Object) {
            for (var k in object) {
                //var p = path + ((String(parseInt(k)) == k) ? '[' + k + ']' : '[\'' + k + '\']');
                var p = path + '[' + k + ']'
                var obj = object[k];
                if (obj instanceof Function) {
                    continue;
                } else if (obj instanceof Object) {
                    fieldMagic(obj, p, result);
                } else {
                    result.push([p, obj])
                }
            }
            return result;
        } else {
            return [path, object];
        }
    }
    function Checklist(element, instanceOptions){

        this.close = close;
        this.show = show;
        this.reset = reset;
        this.disable = disable;
        this.getAttributes = getAttributes;
        this.getValues = getValues;
        this.getAttribute = getAttribute;
        this.getValue = getValue;


        var $button = $(element);
        var $label = $button.find('.checklist-label');
        var $optionsView = $button.find('.checklist-options').hide();
        var $options = $optionsView.find('li');
        var $inputs;


        var name = $button.attr('name');
        var multiple = !!$button.attr('multiple');

        var optionsShow = false;
        var defaultText = $label.text();
        var selectedText = $label.attr('selected-text');
        var emptyText = $optionsView.attr('empty-text') || 'Empty';

        var $emptyHolder = $('<li/>').addClass('empty-holder').text(emptyText).prependTo($optionsView);


        // Bind Events
        $label.bind('click', function(){
            optionsShow = !optionsShow;
            optionsShow ? show() : close();
        });

        $('html').bind('click', clickOutsideHandler);
        !multiple && $optionsView.on('click', 'li', selectSingle);


        // Init
        if(amount = parseInt($button.attr('quantity-amount'))){
            for(var i=1; i<=amount; i++){
                var $option = $('<li/>').attr('value', i).text(i).appendTo($optionsView);
                $options = $options.add($option)
            }
        }
        // Disabled class
        $options.filter('[disabled]').each(function(){
            $(this).toggleClass('disabled', true);
        })

        // Make Multiple
        if(multiple){ 
            $optionsView.addClass('multiple');
            $optionsView.on('click', 'li', selectMultiple);
        }

        function castNumber(num){ return (Number(num) == num) ? Number(num) : num; }

        function clickOutsideHandler(ev) {
            if (!($.contains($button[0], ev.target) || $button[0] == ev.target)) {
                close();
            }
        }

        function elementData(element){
            var attributes = {};
            if(element && element.attributes){
                for(var i in element.attributes){
                    var attr = element.attributes[i];
                    var k = attr.name && (attr.name.match(/^data-(.+)/) || []).pop();
                    k = k && k.replace(/\-/g, '_');
                    attributes[k] = attr.value;

                }
            }
            return attributes;
        }

        function elementText(element) {
            return $(element).contents().map(function() {
                return this.nodeType == 3 ? this.nodeValue : '';
            }).get().join('').replace(/^[\s\n\r\t]|[\s\n\r\t]$/g, '');
        }

        function theAttributes(theOption){
            var json = theOption && theOption.getAttribute('attr');
            var data;
            try{
                data = JSON.parse(json);
            }catch (e){
                data = {};
            }

            data = (data instanceof Object) ? data : {};

            $.extend(data, elementData(theOption) || {});
            
            data[name] = theOption && castNumber(theOption.getAttribute('value'));
            data.value = theOption && castNumber(theOption.getAttribute('value'));

            return data;
        }

        function selectSingle(ev){
            var option = ev.currentTarget
            var value = option.getAttribute('value');
            var attributes = theAttributes(option);

            if(! $(option).is(getOptions()) ){
                return false;
            }

            // unckeck-others
            getOptions().toggleClass('selected', false);
            $(option).toggleClass('selected', true);

            if ($(option).hasClass('check-none')) {
                getOptions().prop('selected', false).toggleClass('selected', false);
            }

            $button.trigger({type: 'checklist.select', value: value, attributes: attributes});
            updateLabel();
            generateFields();
            close();
        }

        function selectMultiple(ev){
            var option = ev.currentTarget;
            var selected = !$(option).prop('selected');

            if(! $(option).is(getOptions()) ){
                return false;
            }

            $(option).toggleClass('selected', selected);
            $(option).prop('selected', selected);

            // select all if check-all selected
            if ($(option).hasClass('check-all')) {
                getOptions().prop('selected', selected).toggleClass('selected', selected);
            }

            // make check-all selected if all selected
            var allSelected = getOptions().filter(':not(.check-all):not(.selected)').length == 0;
            getOptions().filter('.check-all').prop('selected', allSelected).toggleClass('selected', allSelected);
            
            updateLabel();
            generateFields();
            $button.trigger({type: 'checklist.select',value: getValues(), attributes: getAttributes()});
        }

        function reset(){
            getSelected().toggleClass('selected', false);
            updateLabel();
            close();
            $button.trigger({type: 'checklist.reset'});
        }
        function updateLabel(){
            var selectedItems = getSelected(':not(.check-all):not(.check-none)');
            if (selectedItems.length > 1 && selectedText) {
                $label.text(selectedText.replace('%d', selectedItems.length));
            } else if (selectedItems.length) {
                $label.text(selectedItems.map(function() {
                    return elementText(this);
                }).toArray().join(', '));
            } else {
                $label.text(defaultText);
            }            
        }

        function generateFields(){
            var fields = [];
            $button.find('input[type=hidden]').remove();

            if(multiple){
                var values = getSelected().map(function(){ return this.getAttribute('value') }).toArray();
                var fields = fieldMagic(values, name); console.log(fields)
            }else{
                var values = getSelected().attr('value');
                var fields = [fieldMagic(values, name)]
            }

            for(var i in fields){
                $('<input/>', {type: 'hidden', name: fields[i][0], value: fields[i][1]}).appendTo($button);
            }

        }

        function getAttributes(){
            return getSelected().map(function(){
                return theAttributes(this)
            }).toArray();
        }
        function getValues(){
            return getSelected().map(function(){
                return this.getAttribute('value')
            }).toArray();
        }
        function getValue(){
            return (getValues()||[]).shift();
        }
        function getAttribute(key){
            var attrs = (getAttributes()||[]).shift();
            return (key && attrs && attrs[key]) || attrs;
        }
        function getOptions(filter, includeDisabled){
            return $optionsView.find('li')
            .filter(includeDisabled ? '*' : ':not(.disabled)')
            .filter(':not(.empty-holder)')
            .filter(filter ? filter : '*')
        }
        function getSelected(filter){
            return getOptions().filter('.selected').filter(filter || '*');
        }

        function disable(_filter){
            if(_filter instanceof Function){
                getOptions().each(function(){
                    var m = _filter && _filter.call(this, theAttributes(this));
                    m && $(this).toggleClass('selected', false); // unselect it
                    $(this).prop('disabled', m).toggleClass('disabled', m);
                    
                });
            }else{
                // Fix this
                !!_filter && getSelected().toggleClass('selected'); // unselect it
                getOptions(null, true).prop('disabled', !!_filter).toggleClass('disabled', !!_filter);
                
            }
            updateLabel();
            generateFields();

        }

        // function filter(_filter){
        //     console.log(filter, this)
        //     getOptions().each(function(){
        //         var m = _filter && _filter.call(this, theAttributes(this));
        //         $(this).prop('disabled', !m).toggleClass('disabled', !m);
        //     });
        // }

        function show(){
            $optionsView.toggleClass('empty', getOptions().length == 0)
            $optionsView.show();
        }

        function close(){
            optionsShow = false;
            optionsShow ? $optionsView.show() : $optionsView.hide();
        }
    }

    // jquery init inspired by fullCalendar
    $.fn.checklist = function(options) {
        var args = Array.prototype.slice.call(arguments, 1); // for a possible method call
        var res = this; // what this function will return (this jQuery object by default)

        this.each(function(i, _element) { // loop each DOM element involved
            var element = $(_element);
            var cklist = element.data('jquery-checklist'); // get the existing cklist object (if any)
            var singleRes; // the returned value of this single method call

            // a method call
            if (typeof options === 'string') {
                if (cklist && $.isFunction(cklist[options])) {
                    singleRes = cklist[options].apply(cklist, args);
                    if (!i) {
                        res = singleRes; // record the first method call result
                    }
                    if (options === 'destroy') {
                        element.removeData('jquery-checklist');
                    }
                }
            } else if (!cklist) { // don't initialize twice
                cklist = new Checklist(element, options);
                element.data('jquery-checklist', cklist);
            }
        });
        return res;
    };
})(jQuery);