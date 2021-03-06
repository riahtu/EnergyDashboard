angular.module('sideNavSelectorModule').component('sideBarSelector', {
    templateUrl: 'side-nav-selector/side-selector.template.html',
    bindings: {
        itemsToAdd: '<',
        onSelect: '&',
        onDeselect: '&',
        onClear: '&',
        loading: '<',
        onClick: '&',
        selection: '<',
        passSelected: '&'
    },
    controller: [ '$scope', 'pi', function TableController($scope, pi) {
        var self = this;
        var dummyItem = {
            building: "dummyItem",
            hasChildren: false,
            name: '',
            numId: -1,
            template: '',
            webId: ''
        };
        this.selected = [ dummyItem ];

        // Copies everything but the dummy. Used to shallow copy the list for callbacks.
        this.copySelected = function() {
            return this.selected.slice(0, this.selected.length - 1);
        };

        this.removeElement = function (element)   {
            this.selected.splice(this.selected.indexOf(element), 1);

            this.onDeselect({ item: element });
        };

        this.clearSelected = function() {
            this.selected.length = 0;
            this.selected.push(dummyItem);
            this.onClear();
        };

        this.isDummyItem = function(e) {
            return -1 === e.numId;
        };

        this.onDropSuccess = function(element) {
            this.onSelect({ item: element });
        };


        this.$onChanges = function(changes) {
            if (changes.itemsToAdd) {
                var set = { };
                for (var item of this.selected) {
                    set[item.numId] = true;
                }

                for (var item of this.itemsToAdd) {
                    if (!set[item.numId]){
                        this.selected.splice(this.selected.length - 1, 0, item);
                        this.onDropSuccess(item);
                    }
                }
            }
        };




        $scope.$watch('$ctrl.selected', function(newVal, oldVal){
            self.passSelected({selected: self.selected});
        }, true);



    }]
});
