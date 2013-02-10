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

		var layer = this.canvas.layer(10, 15, 200, 200);
		ok(layer !== undefined, "Layer created");

		var rect = layer.rect(20,25,50,50);
		ok(rect !== undefined, "Layer rect created");

		equal(rect.getRelCoord().x,20, "Relative X coordinates check");
		equal(rect.getRelCoord().y,25, "Relative Y coordinates check");

		equal(rect.getAbsCoord().x,30, "Absolute X coordinates check");
		equal(rect.getAbsCoord().y,40, "Absolute Y coordinates check");
		
	});

})();
