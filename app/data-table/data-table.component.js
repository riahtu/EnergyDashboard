angular.module('dataTableModule').component('datatable', {
    templateUrl: 'data-table/data-table.template.html',
    bindings: {
        tableSrc:       '<',
        searchEnabled:  '<',
        reorderEnabled: '<',
        elemName:       '<',   // passed to columnTemplate component to determine template type
        selection:      '='
    },
    controller: ['$filter', '$scope', '$timeout', function TableController($filter, $scope, $timeout) {
        var self = this;
        this.data = [];
        this.sums = {};
        this.averages = {};
        this.columnNames = [];
        this.columnNamesObjs = [];
        this.maxAndMin = {};

        var selectionIndexOf = function(obj) {
            for (var i = 0; i < self.selection.length; i++) {
                if (self.selection[i].webId === obj.webId) {
                    return i;
                }
            }
            return -1;
        };

        var isSelected = function(obj) {
            return selectionIndexOf(obj) !== -1;
        };

        var deselect = function(obj) {
            var idx = selectionIndexOf(obj);
            if (idx !== -1) {
                self.selection.splice(idx, 1);
            }
        };

        var select = function(obj) {
            if (!isSelected(obj)) {
                self.selection.push(obj);
            }
        };

        this.formatValue = function(value) {
            if (value === undefined || value.value === undefined) {
                return "N/A";
            } else if (typeof(value.value) === "number") {
                return $filter('number')(value.value, 2);
            } else {
                return value.value;
            }
        };

        this.valueStyle = function(value) {
            var style = 'dataCell ';
            if (value === undefined) {
                style += 'missing';
            } else if (!value.good) {
                style += 'bad ';
            }
            if (value && isSelected(value)) {
                style += 'selected ';
            }
            return style;
        };

        this.conditionalFormat = function(value){
            if(value == undefined || !value.good){
                return {};
            }
            var r = 0;
            var g = 0;
            var b = 0;
            var max = this.maxAndMin[value.name].max;
            var min = this.maxAndMin[value.name].min;
            var textColor = "white";
            r = ((value.value - min) / (max - min)) * 255;
            g = 0;
            b = ((max - value.value) / (max - min)) * 255;
            if(isNaN(r) || isNaN(b)){
                return {};
                textColor = "black";
            }
            return { "background-color": "rgb(" +Math.round(r)+ "," +g+ "," +Math.round(b)+ ")",
                    "color": textColor };
        }

        this.getters = {
            value: function(key, element) {
                return element[key].value;
            }
        };

        this.$onChanges = function() {
            if (this.searchEnabled === undefined) {
                this.searchEnabled = true;
            }
            if (this.reorderEnabled === undefined) {
                this.reorderEnabled = true;
            }
            if (this.selection === undefined) {
                this.selection = [];
            }
            if (this.tableSrc.length == 0) {
                return;
            }

            //console.log(this.tableSrc);
//            console.log("Datatable elemName", this.elemName);

            var columnSet = {};

            for (var element of this.tableSrc) {
                for (var key in element) {
                    if (key !== "name" && key !== "building") {
                        columnSet[key] = true;
                    }
                }
            }

            this.columnNamesObjs = [];

            this.columnNames = Object.keys(columnSet);

            var firstValues = 0;
            for (var columnName of this.columnNames) {
                var column = {};

                column.name = columnName;

                try{
                    column.units = self.tableSrc[0][column.name].unitsAbbreviation;
                }
                catch(e){
                    column.units = "";
                }
                // Set the first 10 values as default
                if (firstValues < 10) {
                    column.isChecked = true;
                } else {
                    column.isChecked = false;
                }
                this.columnNamesObjs.push(column);
                firstValues++;
            }

            for (var element of this.tableSrc) {
                for (var name in element) {
                    Object.assign(element[name], { parentName: element.name, buildingName: element.building });
                }
            }

            this.displayed = this.data = this.tableSrc;
        }; //end $onChanges

        this.ShowColumnList = function(columnsNames) {
            // just a check to make sure the button can not be clicked when there is nothing to show
            if (columnsNames.length != 0) {
                document.getElementById("myDropdown").classList.toggle("show");
            }
        };



        this.updateCalculations = function() {
            this.sums = {};
            this.averages = {};
            this.maxAndMin = {};
            for (var column of this.columnNamesObjs) {
                this.sums[column.name] = this.sumColumn(column.name);
                this.averages[column.name] = this.averageColumn(column.name);
                this.maxAndMin[column.name] = this.maxMinColumn(column.name);
            }
        };

        this.sumColumn = function(columnName) {
            var acc = this.reduceColumn(columnName, { sum: 0 }, function(val, acc) { acc.sum += val; });
            return acc.sum;
        };

        this.averageColumn = function(columnName) {
            var acc = this.reduceColumn(columnName, { sum: 0, len: 0 }, function(val, acc) {
                acc.sum += val;
                acc.len++;
            });
            return acc.len > 0 ? acc.sum / acc.len : 0;
        };

        this.maxMinColumn = function(columnName){
            var acc = this.reduceColumn(columnName, {max: null, min: null}, function(val, acc){
                if(acc.max == null){
                    acc.max = val;
                }
                else if(val > acc.max){
                    acc.max = val;
                }

                if(acc.min == null){
                    acc.min = val;
                }
                else if(val < acc.min){
                    acc.min = val;
                }
            });
            return acc;
        }

        // For every currently displayed row in column 'columnName', applies the function 'opFunc' to the cell's value and the accumulator object 'accumulator'.
        // Returns the accumulated value object.
        this.reduceColumn = function(columnName, accumulator, opFunc) {
            var a = accumulator;
            for (var element of this.displayed) {
                var colVal = element[columnName];
                if (colVal && colVal.good && colVal.value != undefined) {
                    opFunc(colVal.value, a);
                }
            }
            return a;
        };

        this.updateCol = function(cols){
            this.columnNamesObjs = cols;
        };

        this.toggleCellSelected = function(value) {
            if (isSelected(value)) {
                deselect(value);
            } else {
                select(value);
            }
        };

        // Whenever the displayed data is changed, recalculate sum and average of the shown rows only
        $scope.$watch('$ctrl.displayed', function(newValue, oldValue) {
            console.log("Recalculating...");

            self.updateCalculations();
        });

        var timeoutPromise;
        var delayInMs = 200;
        var newWatch  = true;
        $scope.$watch('$ctrl.columnNamesObjs', function(newValue, oldValue){

            $timeout.cancel(timeoutPromise);  //does nothing, if timeout alrdy done
            timeoutPromise = $timeout(function() {   //Set timeout
                console.log("timeout fired");
                if (!newWatch) {
                    //is not a new watch
                    newWatch = true;
                    console.log('ignoring duplicate watch');
                    return;
                }

                var tableRef = document.getElementById('dataTable');

                var headerHeight = document.getElementById('dataTableHead').offsetHeight;
                console.log('header height: '+headerHeight);

                tableRef.style.top = headerHeight + "px";

                console.log('data table top: '+tableRef.style.top)



                console.log("table has this many rows");
                console.log(tableRef.rows.length);

                console.log(self.columnNamesObjs);

                for (var i = 0; (i < 3) && (i < tableRef.rows.length); i++) {
                    var col;


                    var tableRow = tableRef.rows[i];
                    var c = 0;
                    for (var j = 0; j < tableRow.cells.length; j++) {
                        var tableCell = tableRow.cells[j];
                        var print = '#' + i + ',' + j + ': ' + tableCell.offsetWidth;
                        /*
                         var textNode = document.createTextNode(print)
                         tableCell.appendChild(textNode);
                         */
                        console.log(print);

                        if (i === 2) {
                            newWatch = false;
                            if (j === 0) {
                                tableRef.rows[0].cells[j].style.maxWidth = tableCell.offsetWidth + 'px';
                                tableRef.rows[0].cells[j].style.minWidth = tableCell.offsetWidth + 'px';

                            }
                            else if (j === 1) {
                                tableRef.rows[0].cells[j].style.maxWidth = tableCell.offsetWidth + 'px';
                                tableRef.rows[0].cells[j].style.minWidth = tableCell.offsetWidth + 'px';

                            }
                            else {
                                col = self.columnNamesObjs[c];
                                console.log("enter with col: " + col.name);
                                console.log("is checked: " + col.isChecked);

                                for (; !col.isChecked; c++) {
                                    console.log("skipping over: " + col.name);
                                    col = self.columnNamesObjs[c];
                                }

                                c++;
                                console.log("found: " + col.name)
                                col.width = tableCell.offsetWidth + 'px';
                                console.log("changing width to: " + tableCell.offsetWidth);
                            }
                        }
                    }
                }

            }, delayInMs);
        }, true);


        this.colUpdate = function(column){
            console.log(column.name + " changed");
        }



    }]
});
