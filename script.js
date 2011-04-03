/**
 * @class JSBimaru
 * @author Julian Wachholz
 */
(function(window){

/**
 * @constructor JSBimaru
 */
jsbimaru_ = function(){
	this.timerEl = $("#playtime");
	this.buildCanvas(10, 10);
	this.currentMode = parseInt($.cookie("mode")) || 1;
	$("#mode-"+this.currentMode).addClass("selected");

	window.onbeforeunload = this.unload;
	$(document).keypress(this.keyPress).keydown(this.keyDown);
	$("#canvas td").live("click", this.canvasClick);
	$("#tiles td").click(this.tilesClick);
	$("#playmode li").click(this.selectMode);
	// TODO: show conflicts
};

jsbimaru_.prototype = {
	/** config **/
	gameRunning: false,
	startTime: 0,
	moveCount: 0,
	showConflicts: false,
	currentMode: null,
	currentTile: null,
	currentCell: null,

	tileSet: {
		0: "", // blank
		13: "water",
		48: "ship-single",
		52: "ship-left",
		56: "ship-top",
		54: "ship-right",
		50: "ship-bottom",
		53: "ship-center",
		46: "ship-unknown",
		43: "water",
		45: "water"
	},

	tileSetInv: {
		"": 0,
		"water" : 13,
		"ship-single" : 48,
		"ship-left" : 52,
		"ship-top" : 56,
		"ship-right" : 54,
		"ship-bottom" : 50,
		"ship-center" : 53,
		"ship-unknown" : 46,
		"water-horizontal" : 43,
		"water-vertical" : 45
	},

	currentGrid: [],

	selectMode: function(){
		$(this).addClass("selected")
		.siblings().removeClass("selected");

		jsb.currentMode = parseInt($(this).attr("id").substr(5));
		if(jsb.currentMode == 1) {
			$("#canvas td.selected").removeClass("selected");
		} else {
			$("#tiles td.selected").removeClass("selected");
		}

		jsb.currentTile = null;
		jsb.currentCell = null;

		$.cookie("mode", jsb.currentMode, { expires: 365 });
	},

	newGame: function(){
		$("#aside dl").animate({
			"opacity": 1
		}, 400).css("z-index", 2).siblings("div").css("z-index", 1).animate({
			"opacity": 0
		}, 200);
		this.startTime = new Date().getTime();
		this.gameRunning = true;
		this.incMoves(0);
		this.timer = window.setInterval(this.playTime, 1000, this);
	},

	tilesClick: function(){
		if(jsb.currentMode == 1) {
			$("#tiles td.selected").removeClass("selected");
			$(this).addClass("selected");
			jsb.currentTile = jsb.tileSetInv[$(this).children("div").attr("id")];
		} else if(jsb.currentCell != null) {
			if(jsb.currentCell.is(".set")) {
				var o = jsb.currentCell.offset();
				tooltip(o.left+16, o.top+5, "This tile can't be changed!");
				return;
			} else if($(this).children("div").is("#water-horizontal")) {
				var row = jsb.currentCell.parent().parent().index();
				$("#canvas tbody tr:eq("+row+") td>div").each(function(i,el){
					if(el.className == "") {
						el.className = "water";
						jsb.currentGrid[row][i] = 0;
					}
				});
				return;
			} else if($(this).children("div").is("#water-vertical")) {
				var col = jsb.currentCell.parent().index();
				$("#canvas tbody tr td:nth-child("+(col+1)+")>div").each(function(i,el){
					if(el.className == "") {
						el.className = "water";
						jsb.currentGrid[i][col] = 0;
					}
				});
				return;
			}
			var n = $(this).children("div").attr("id"),
				c = jsb.getCoords(jsb.currentCell.parent());
			jsb.currentCell.attr("class", n);
			jsb.currentGrid[c[1]][c[0]] = n == "water" ? 0 : jsb.tileSetInv[n];
			jsb.incMoves();
		} else {
			var o = $(this).offset();
			tooltip(o.left+16, o.top+5, "No cell selected!");
		}
	},

	canvasClick: function(){
		if(jsb.currentMode == 1) {
			if(jsb.currentTile != null && !$(this).children("div").is(".set")) {
				if(jsb.currentTile == 43) {
					// horizontal
					var row = $(this).parent().index();
					$("#canvas tbody tr:eq("+row+") td>div").each(function(i,el){
						if(el.className == "") {
							el.className = "water";
							jsb.currentGrid[row][i] = 0;
						}
					});
					return;
				} else if(jsb.currentTile == 45) {
					// vertical
					var col = $(this).index();
					$("#canvas tbody tr td:nth-child("+(col+1)+")>div").each(function(i,el){
						if(el.className == "") {
							el.className = "water";
							jsb.currentGrid[i][col] = 0;
						}
					});
					return;
				}
				$(this).children("div").attr("class", jsb.tileSet[jsb.currentTile]);
				var c = jsb.getCoords($(this));
				jsb.currentGrid[c[1]][c[0]] = jsb.currentTile == 13 ? 0 : jsb.currentTile;
				jsb.incMoves();
			} else if($(this).children("div").is(".set")) {
				var o = $(this).offset();
				tooltip(o.left+16, o.top+5, "This tile can't be changed!");
			} else if(!jsb.currentTile) {
				var o = $(this).offset();
				tooltip(o.left+16, o.top+5, "No tile selected!");
			}
		} else {
			$("#canvas td.selected").removeClass("selected");
			$(this).addClass("selected");
			jsb.currentCell = $(this).children("div");
		}
	},

	keyPress: function(e){
		var n = null;
		switch(e.which)
		{
			case 13: // water (single)
			case 43: // TODO: water (horizontal)
			case 45: // TODO: water (vertical)
			case 46: // ship-unknown
			case 48: // ship-single
			case 50: // ship-bottom
			case 52: // ship-left
			case 53: // ship-center
			case 54: // ship-right
			case 56: // ship-top
				n = e.which;
				break;
			default:
				return;
		}

		if(jsb.currentMode == 1) {
			var s = $("#"+jsb.tileSet[n]).parent();
			s.parent().parent().find(".selected").removeClass("selected");
			s.addClass("selected");
			jsb.currentTile = n;
		} else {
			if(jsb.currentCell == null) {
				var o = $("#"+jsb.tileSet[n]).offset();
				tooltip(o.left+16, o.top+5, "No cell selected!");
				return;
			} else if(n == 43) {
				// horizontal
				var row = jsb.currentCell.parent().parent().index();
				$("#canvas tbody tr:eq("+row+") td>div").each(function(i,el){
					if(el.className == "") {
						el.className = "water";
						jsb.currentGrid[row][i] = 0;
					}
				});
				return;
			} else if(n == 45) {
				// vertical
				var col = jsb.currentCell.parent().index();
				$("#canvas tbody tr td:nth-child("+(col+1)+")>div").each(function(i,el){
					if(el.className == "") {
						el.className = "water";
						jsb.currentGrid[i][col] = 0;
					}
				});
			} else if(jsb.currentCell.is(".set")) {
				var o = jsb.currentCell.offset();
				tooltip(o.left+16, o.top+5, "This tile can't be changed!");
				return;
			}
			var td = $("#canvas td.selected>div").attr("class", jsb.tileSet[n])
				.parent(),
				c = jsb.getCoords(td);
			jsb.currentGrid[c[1]][c[0]] = n == 13 ? 0 : n;
			jsb.incMoves();
		}
	},

	keyDown: function(e){
		switch(e.keyCode) {
			case 37: // left arrow
				if(jsb.currentCell.parent().index() == 0) return;
				jsb.currentCell = jsb.currentCell.parent()
					.removeClass("selected").prev()
					.addClass("selected").children("div");
				break;
			case 38: // up arrow
				var td = jsb.currentCell.parent(),
					i = td.index();
				if(td.parent().index() == 0) return;
				td.removeClass("selected");
				jsb.currentCell = td.parent().prev()
								  .children("td").eq(td.index()).addClass("selected")
								  .children("div");
				break;
			case 39: // right arrow
				if(jsb.currentCell.parent().index() == 9) return;
				jsb.currentCell = jsb.currentCell.parent()
					.removeClass("selected").next()
					.addClass("selected").children("div");
				break;
			case 40: // down arrow
				var td = jsb.currentCell.parent(),
					i = td.siblings().andSelf().index(td);
				if(td.parent().index() == 9) return;
				td.removeClass("selected");
				jsb.currentCell = td.parent().next()
								  .children("td").eq(i).addClass("selected")
								  .children("div");
				break;
			default:
				return;
		}
	},

	loadGame: function(json){
		this.buildCanvas(json.wh);
		this.currentGrid = json.gr;

		$("#canvas tbody tr").each(function(i, row){
			if(i == json.wh) {
				// last row
				$(this).children("th").each(function(j, cell){
					cell.innerHTML = json.gr[json.wh][j];
				});
				return;
			}

			$(this).find("td>div,th").each(function(j,cell){
				if($(cell).is("th")) {
					cell.innerHTML = json.gr[i][json.wh];
					return;
				}

				if(json.gr[i][j] != 0) {
					$(this).attr("class", jsb.tileSet[json.gr[i][j]]+" set");
					if(json.gr[i][j] == 13) {
						jsb.currentGrid[i][j] = 0;
					}
				}
			});
		});

		this.shipPieces(json.sp);
		this.countShips();

		// TODO: check if json really is valid

		$(".modal:visible").fadeOut(600, function(){
			jsb.newGame();
		});
	},

	loadBimaru: function(){
		var id = this.innerHTML;
		$.get("bim/"+id+".json", function(json){
			if(typeof json !== "object")
				json = $.parseJSON(json);
			jsb.loadGame(json);
		});
	},

	shipPieces: function(sp){
		var el = $("#ships"),
			len, i, j;

		$("#ships>div").remove();

		for(len = sp.length; len > 0; len--) {
			for(i = 0; i < sp[len-1]; i++) {
				ship = "<div class=\"ship"+len+"\">";
				if(len == 1){
					ship += "<div class=\"ship-single\" />";
				} else {
					ship += "<div class=\"ship-left\" />";
					for(j = 1; j < len-1; j++){
						ship += "<div class=\"ship-center\" />";
					}
					ship += "<div class=\"ship-right\" />";
				}
				ship += "</div>";
				el.append(ship);
			}
		}
	},

	countShips: function(){
		if(!this.gameRunning) return;
		/* counts how many ships we have set */
		var i, j, h, cg = this.currentGrid, s = $("#ships");

		$("#ships>div").removeClass("done");

		// horizontal
		for(i = 0; i < cg.length; i++){
			for(j = 0; j < cg[i].length; j++) {
				if(cg[i][j] == 48) {
					$("div.ship1:not(.done):first", s).addClass("done");
					continue;
				}

				if(cg[i][j] == 52) {
					for(h = 1; h < 8; h++){
						if(cg[i][j+h] == 53)
							continue;
						else if(cg[i][j+h] == 54)
							$("div.ship"+(h+1)+":not(.done):first", s).addClass("done");
						else
							break;
					}
				}
			}
		}

		// vertical
		for(i = 0; i < cg.length; i++){
			for(j = 0; j < cg[i].length; j++) {
				if(cg[i][j] == 56) {
					for(h = 1; h < 8 && i+h < cg.length; h++){
						if(cg[i+h][j] == 53)
							continue;
						else if(cg[i+h][j] == 50)
							$("div.ship"+(h+1)+":not(.done):first", s).addClass("done");
						else
							break;
					}
				}
			}
		}

		// check if all pieces are set, then check if game is solved
		if($("#ships>div.done").size() == $("#ships>div").size()) {
			this.checkSolveState();
		}
	},

	playTime: function(){
		var secs = Math.round((new Date().getTime() - jsb.startTime) / 1000);
		var hours = Math.round(secs / 3600);
			secs %= 3600;
		var mins = Math.round(secs / 60);
			secs %= 60;

		jsb.timerEl.html(
			(hours < 10 ? "0" : "") + hours + ":" +
			(mins < 10 ? "0" : "") + mins + ":" +
			(secs < 10 ? "0" : "") + secs
		);
	},

	buildCanvas: function(wh){
		wh = wh >= 10 ? 10 : wh;

		var t = $("#canvas table tbody"),
			canvas = "", i, j,
			gridY = [], gridX;

		for(i = 0; i < wh; i++){
			canvas += "<tr class=\"row"+i+"\">";
			gridX = [];
			for(j = 0; j < wh; j++){
				canvas += "<td><div id=\"row"+i+"col"+j+"\" /></td>";
				gridX.push(0);
			}
			canvas += "<th>0</th>";
			canvas += "</tr>";
			gridY.push(gridX);
		}

		canvas += "<tr>";
		for(j = 0; j < wh; j++){
			canvas += "<th>0</th>";
		}
		canvas += "</tr>";

		this.currentGrid = this.solutionGrid = gridY;

		t.html(canvas);
	},

	getCoords: function(td){
		var x = td.siblings().andSelf().index(td),
			y = td.parent().siblings().andSelf().index(td.parent());

		return [x,y];
	},

	incMoves: function(i){
		if(!this.gameRunning) return;

		if(i == undefined){
			$("#moves").html(++this.moveCount);
		} else {
			this.moveCount = i;
			$("#moves").html(i);
		}

		this.countShips();
	},

	checkSolveState: function(){
		var solved = true;

		var c = $("#canvas tbody"),
			row = c.children("tr");

		row.each(function(i){
			if(!solved || i == row.size()-1) return;
			if($(this).find("td>div[class^=ship]").size() !== parseInt($(this).children("th").html()))
				solved = false;
		});
		if(!solved) return;

		row.first().children("td").each(function(i){
			if(!solved) return;
			if(row.find("td:nth-child("+(i+1)+")>div[class^=ship]").size() !== parseInt(row.last().children().eq(i).html()))
				solved = false;
		});
		if(!solved) return;

		alert("You solved it!\nIt took you: " + this.timerEl.html());
		clearInterval(this.timer);
		this.gameRunning = false;

		$("#aside dl").animate({
			"opacity": 0
		}, 400).css("z-index", 1).siblings("div").css("z-index", 2).animate({
			"opacity": 1
		}, 200);

		// TODO complete test
	},

	unload: function(){
		if(jsb.gameRunning) {
			return "Ongoing game! Do you really want to continue?";
		} else {
			return;
		}
	}
};

window.JSBimaru = jsbimaru_;

})(window);

$(function(){
	jsb = new JSBimaru();

	$("button.cancel").click(function(){
		$(this).parents(".modal").fadeOut(600);
	});

	$("#help").click(function(){
		$("#modal-help").fadeIn(400);
	});

	$.get("bim/list.php", function(str){
		var games = str.split(","), id,
			gEasy = "", gNorm = "", gHard = "";
		for(id in games) {
			switch(parseInt(games[id].substr(0,1))) {
				case 0:
					gEasy += "<li>"+games[id]+"</li>";
					break;
				case 1:
					gNorm += "<li>"+games[id]+"</li>";
					break;
				case 2:
					gHard += "<li>"+games[id]+"</li>";
					break;
			}
		}

		if(gEasy == "")
			$("#modal-start .easy").hide();
		else
			$("#modal-start ul.games.easy").html(gEasy);

		if(gNorm == "")
			$("#modal-start .normal").hide();
		else
			$("#modal-start ul.games.normal").html(gNorm);

		if(gHard == "")
			$("#modal-start .hard").hide();
		else
			$("#modal-start ul.games.hard").html(gHard);

		$("#modal-start ul.games li").click(jsb.loadBimaru);
	});

	$("#new-game").click(function(){
		$("#modal-start").fadeIn(400);
	});

	$("#load-game").click(function(){
		$("#modal-load").fadeIn(400);
		$("#load").val("").focus();
	});

	$("#modal-load textarea").focus(function(){
		this.select();
	});

	$("#modal-load button:not(.cancel)").click(function(){
		var str = $(this).siblings("textarea").val();
		if(str == "") {
			alert("No input!");
			return;
		}
		try{
			var game = $.parseJSON(str);
		}catch(e){
			alert("Invalid savegame!");
			return;
		}

		jsb.loadGame(game);
	});
});

function tooltip(x,y,c){
	var t = $("#tooltip").show(),
		tc = $("#tcontent").html(c);

	clearTimeout(t.data("timer"));

	$("#tarrow").css({
		"margin-top": tc.outerHeight(),
		"margin-left": Math.round((tc.width()+4) / 2)
	});

	t.css({
		opacity: 0,
		top: y - t.outerHeight() - 13,
		left: x - Math.round(t.outerWidth() / 2)
	}).animate({
		opacity: 1,
		top: "+=10"
	}, 400);

	t.data("timer", setTimeout(function(){
		t.animate({
			opacity: 0
		}, 400, function(){
			$(this).hide()
		});
	}, 2200));
};
