angular.module('analysisModule').component('analysis', {
    templateUrl: 'analysis/analysis.template.html',
    bindings: {
        webIds:            '<',
        elemName:          '<', // passed to columnTemplate component to determine template type
        onStartLoad:       '&',
        onEndLoad:         '&',
        sideSelectorItems: '<'
    },
    controller: ['$filter', '$scope', 'pi', 'conditionalFormatting', 'reduceColumn',
        function AnalysisController($filter, $scope, pi, cf, rc) {
            var self = this;
            this.sums = {};
            this.averages = {};
            this.maxAndMin = {};
            this.currentFormattingSettingsCol = {}; //Current col for CF settings
            this.showFormattingSettingsButtons = true;
            $scope.cf = cf; //Give html access to cf service
            this.datePicker = {};
            this.datePicker.date = {
                startDate: moment().startOf('day'),
                endDate: moment()
            };

            this.DRPOptions = {
                "showDropdowns": true,
                "timePicker": true,
                "timePickerIncrement": 15,
                "autoApply": true,
                "ranges": {
                    "Today": [
                        moment().startOf('day'), moment()
                    ],
                    "Past 24 Hours": [
                        moment().subtract(1, 'days'),
                        moment()
                    ],
                    "Last 7 Days": [
                        moment().subtract(7, 'days'),
                        moment()
                    ],
                    "Past Month": [
                        moment().subtract(1, 'months'),
                        moment()
                    ],
                    "Past Year": [
                        moment().subtract(1, 'years'),
                        moment()
                    ]
                }
            };
            this.data = [];

            this.outerColumnNames = [];
            this.innerColumnNames = [{
                // Names must match this exactly from pi service
                name: "Average",
                display: "Avg",
                isChecked: true
            }, {
                name: "Maximum",
                display: "Max",
                isChecked: true
            }, {
                name: "Minimum",
                display: "Min",
                isChecked: true
            }, {
                name: "StdDev",
                display: "SD",
                isChecked: true
            }];

            this.startAnalysis = function() {
                this.onStartLoad();

                var startDate = self.datePicker.date.startDate.format();
                var endDate = self.datePicker.date.endDate.format();
                pi.getSummaryOfElements(this.webIds, startDate, endDate).then(function(response) {
                    var data = [];

                    for (var element of response) {
                        var values = [];
                        for (var value of element.values) {
                            if (value.values) {
                                values.push(pi.tabulateValues(value));
                            }
                        }
                        element.values = values;
                        data.push(pi.tabulateValues(element));
                    }

                    self.data = data;

                    //console.log(self.data);

                    var colNames = [];
                    var columnSet = {};

                    for (var element of self.data) {
                        for (var key in element) {
                            if (key !== "name" && key !== "building") {
                                columnSet[key] = true;
                            }
                        }
                    }


                    var firstValues = 0;
                    for (var element of Object.keys(columnSet)) {
                        var column = {};
                        column.name = element;

                        if (firstValues < 10) {
                            column.isChecked = true;
                        } else {
                            column.isChecked = false;
                        }
                        colNames.push(column);
                        firstValues++;
                    }

                    self.outerColumnNames = colNames;

                    // Give outerColumnNames some inner cols with default vals
                    self.outerColumnNames.forEach(function(currOuter, index, array){
                        self.innerColumnNames.forEach(function(currInner, indexInner, array){
                            if(currOuter[currInner.name] == undefined){
                                currOuter[currInner.name] = { 
                                    showConditionalFormat: true,
                                    maxColor: 'Red',
                                    minColor: 'Blue'
                                };
                            }
                        });
                    });
                    self.onEndLoad();
                });
            };

            this.$onChanges = function(changes){
                console.log(changes)
                if(!angular.isUndefined(changes.sideSelectorItems)){
                    if(changes.sideSelectorItems.currentValue.length == 1 &&
                        changes.sideSelectorItems.currentValue[0].building == "dummyItem"){
                        this.data = [];
                    }

                }
            }

            this.getters = {
                value: function(outerName, innerName, element) {
                    return element[outerName][innerName].value;
                }
            };

            // Called in html to open the CF settings modal
            this.openCogModal = function(outerCol, innerCol) {
                this.currentFormattingSettingsCol = outerCol;
                if(outerCol[innerCol.name] == undefined){
                    this.currentFormattingSettingsCol.currInner = innerCol;
                }
                else{
                    this.currentFormattingSettingsCol.currInner = outerCol[innerCol.name];
                    if(this.currentFormattingSettingsCol.currInner.name == undefined)
                    {
                        this.currentFormattingSettingsCol.currInner.name = innerCol.name;
                    }
                }
                this.currentFormattingSettingsCol.display = String(this.currentFormattingSettingsCol.name) + " [" + String(this.currentFormattingSettingsCol.currInner.name) + "]";
                cf.showFormattingSettings(outerCol, 'formattingSettingsModalAnalysis');
                //console.log(this.currentFormattingSettingsCol);
            };

            this.printMaxOrMin = function(maxMin){
                // Avoid erorr in console (when this runs before we have data)
                if(this.currentFormattingSettingsCol == undefined || this.currentFormattingSettingsCol.name == undefined){
                    return;
                }
                // No user defined max/min
                if(this.currentFormattingSettingsCol.currInner == undefined ||  this.currentFormattingSettingsCol.currInner[maxMin] == undefined){
                    return this.maxAndMin[this.currentFormattingSettingsCol.name][this.currentFormattingSettingsCol.currInner.name][maxMin];
                }
                // Otherwise use the userdefined max/min
                return this.currentFormattingSettingsCol.currInner[maxMin];


            };

            // Called in html to toggle CF
            this.toggleConditionalFormatting = function(outerCol, innerCol){
                if(outerCol[innerCol.name] == undefined && outerCol != undefined){
                    outerCol[innerCol.name] = {};
                }
                outerCol[innerCol.name].showConditionalFormat = !outerCol[innerCol.name].showConditionalFormat;
            };

            this.submitFormattingSettings = function(outerCol){
                outerCol[outerCol.currInner.name] = {};
                var submittedMax = document.getElementById("maxInputAnalysis").value;
                var submittedMin = document.getElementById("minInputAnalysis").value;

                if(submittedMax.length != 0)
                    outerCol[outerCol.currInner.name].max = submittedMax;
                else{
                    outerCol[outerCol.currInner.name].max = null
                }
                if(submittedMin.length != 0)
                    outerCol[outerCol.currInner.name].min = submittedMin;
                else{
                    outerCol[outerCol.currInner.name].min = null
                }
                outerCol[outerCol.currInner.name].maxColor = document.getElementById("maxColorAnalysis").value;
                outerCol[outerCol.currInner.name].minColor = document.getElementById("minColorAnalysis").value;

                document.getElementById("conditionalFormatFormAnalysis").reset();
              };

              this.showHideSettingsButtons = function(){
                  this.showFormattingSettingsButtons = !this.showFormattingSettingsButtons;
              };


            this.formatValue = function(value) {
                if (value === undefined) {
                    return "N/A";
                } else if (value.good && typeof(value.value) === "number") {
                    return $filter('number')(value.value, 2);
                } else {
                    return "ERROR";
                }
            };

            this.valueStyle = function(value) {
                var style = 'dataCell ';
                if (value === undefined) {
                    style += 'missing';
                } else if (!value.good) {
                    style += 'bad ';
                }
                return style;
            };

            this.conditionalStyle = function(element, outer, inner) {
                var innerCol = outer[inner.name], outerVal = element[outer.name];
                if (innerCol !== undefined && outerVal !== undefined) {
                    return cf.conditionalFormat(outerVal[inner.name], innerCol, this.maxAndMin[outer.name], true);
                } else {
                    return {};
                }
            }

            // Callback for column-template-dropdown component
            this.updateCol = function(cols) {
                this.outerColumnNames.forEach(function(outer, index) {
                    for (var inner of self.innerColumnNames) {
                        if(!angular.isUndefined(cols[index])){
                            if (cols[index][inner.name] === undefined) {
                                cols[index][inner.name] = { 
                                    showConditionalFormat: true,
                                    maxColor: 'Red',
                                    minColor: 'Blue'
                                };
                            }
                        }
                    }
                });
                this.outerColumnNames = cols;
            };

            this.updateCalculations = function() {
                this.sums = {};
                this.averages = {};
                this.maxAndMin = {};
                for (var column of this.outerColumnNames) {
                    var innerAverages = this.data.map(function(row) {
                        var avg = {};
                        if(!angular.isUndefined(row[column.name])){
                            return row[column.name].Average;
                        }
                        return avg;
                    });
                    var innerMaxs = this.data.map(function(row) {
                        var max = {};
                        if(!angular.isUndefined(row[column.name])){
                            return row[column.name].Maximum;
                        }
                        return max;
                    });
                    var innerMins = this.data.map(function(row) {
                        var min = {};
                        if(!angular.isUndefined(row[column.name])){
                            return row[column.name].Minimum;
                        }
                        return min;
                    });
                    var innerStdDev = this.data.map(function(row) {
                        var sd = {};
                        if(!angular.isUndefined(row[column.name])){
                            return row[column.name].StdDev;
                        }
                        return sd;
                    });

                    // this.sums[column.name] = rc.sum(col);
                    // this.averages[column.name] = rc.average(col);
                    this.maxAndMin[column.name] = {
                        Average: {
                            min: rc.min(innerAverages),
                            max: rc.max(innerAverages)
                        },
                        Maximum: {
                            min: rc.min(innerMaxs),
                            max: rc.max(innerMaxs)
                        },
                        Minimum: {
                            min: rc.min(innerMins),
                            max: rc.max(innerMins)
                        },
                        StdDev: {
                            min: rc.min(innerStdDev),
                            max: rc.max(innerStdDev)
                        }
                    };
                }
            };

            $scope.$watch('$ctrl.data', function(newValue, oldValue) {
                self.updateCalculations();
            });
        }
    ]
});


    function isNumberKey(evt){
        var charCode = (evt.which) ? evt.which : event.keyCode
        if (charCode > 31 && (charCode < 48 || charCode > 57))
            return false;
        return true;
    }
