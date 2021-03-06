angular.module('core.conditionalFormatting').
    factory('conditionalFormatting', [
        function() {
            var cf = {};

            // Easily make rgb obj
            function rgb(r, g, b) {
                return { r: r, g: g, b: b };
            }

            // Predefined colors
            cf.white = rgb(255, 255, 255);
            // cf.blue = rgb(0, 0, 255);
            cf.blue = rgb(106, 166, 186);
            // cf.red = rgb(255, 0, 0);
            cf.red = rgb(244,99,106);

            // cf.green = rgb(0,100,0);
            cf.green = rgb(120, 223, 111);
            // cf.purple = rgb(160,32,240);
            cf.purple = rgb(161, 116, 164);
            cf.yellow = rgb(248, 194, 0);
            cf.init = function(column){
                //All columns start showing conditional formating
                column.showConditionalFormat = true;
            };

            // =====--- CONDITIONAL FORMATTING ---===== //

            cf.isUndefined = function(thing) {
                return angular.isUndefined(thing);
            };



            cf.showFormattingSettings = function(col, modalClass){
                $("."+ modalClass).modal();
            };

            /**
             * Returns style for conditional formatting
             * @param value - numeric value used to determine color
             * @param col - column that the value is part of
             * @param maxAndMin - max and min array containing col
             * @return css style
             */
            cf.conditionalFormat = function(value, col, maxAndMin, isAnalysis){
                //console.log("isAnalysis: ", isAnalysis);
                // Do nothing on bad/undef values
                if(value == undefined || !value.good || maxAndMin[value.name] == undefined){
                    return {};
                }

                // Remove conditional formatting for data tab
                if(col.showConditionalFormat == false){
                    return {};
                }
                // Check is there is a user submitted max and min else use the max/ min of current data.
                var max, min;
                if(!angular.isUndefined(col.max) && col.max != null){
                    max = Number(col.max)
                }
                else{
                    max = maxAndMin[value.name].max;
                }

                if(!angular.isUndefined(col.min) && col.min != null){
                    min = Number(col.min)
                }
                else{
                    min = maxAndMin[value.name].min;
                }
                if(max == min){
                    return {};
                }

                // Check if user submitted color, if not default to red and blue for max and min respectivly.
                var maxColor = cf.red, minColor = cf.blue;
                if(col.maxColor == "Red"){
                    maxColor = cf.red;
                }
                else if(col.maxColor == "Blue"){
                    maxColor = cf.blue;
                }
                else if(col.maxColor == "Green"){
                    maxColor = cf.green;
                }
                else if(col.maxColor == "Purple"){
                    maxColor = cf.purple;
                }

                if(col.minColor == "Red"){
                    minColor = cf.red;
                }
                else if(col.minColor == "Blue"){
                    minColor = cf.blue;
                }
                else if(col.minColor == "Green"){
                    minColor = cf.green;
                }
                else if(col.minColor == "Purple"){
                    minColor = cf.purple;
                }


                var grad = ecoUtils.gradient([
                    { value: min, color: minColor},
                    { value: (max+min)/2, color: cf.white },
                    { value: max, color: maxColor},
                ]);

                color = grad(value.value);

                if (color === undefined) {
                    return {};
                }

                var textColor = "white";
                // Calculate overall intensity of color to determine text color
                var intensity = color.r * 0.299 + color.g * 0.597 + color.b * 0.114;
                if (intensity > 186) {
                    textColor = "black";
                }

                return { "background-color": "rgb(" +color.r+ "," +color.g+ "," +color.b+ ")",
                        "color": textColor };
            }

            return cf;

        }
    ]);
