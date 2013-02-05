(function($) {

	module('ncanvas', {
		setup: function() {
			this.canvas = $nc(document.getElementById("sample"), {});
		}
	});

	test("canvas creation", function() {
		ok(this.canvas !== undefined, "Passed!");
	});

	test("canvas layer", function() {
		var layer = this.canvas.layer(0, 0, 200, 200);
		ok(layer !== undefined, "Passed!");
	});

})();
