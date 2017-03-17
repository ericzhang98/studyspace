var currTheme;
var currIsDay;
var NUM_THEMES = 4;

// set color theme
var tn = getCookie('theme_num');
var is_day = getCookie('is_day') == 'true';
setTheme(tn ? parseInt(tn) : 1);
setMode(is_day);

function setMode(is_day = !currIsDay) {

	var base, base_two, base_focus, over_base, over_base_two, over_base_focus, line, panel;

	if (is_day) {
		base = '#f0f0f0';
		base_two = '#f7f7f7';
		base_focus = '#3a3a3a';
		over_base = '#353535';
		over_base_focus ='#ffffff';
		panel = '#434343';
		line = '#dddddd';
		currIsDay = true;
	}

	else {
		base = '#353535';
		base_two = '#262626';
		base_focus = '#262626';
		over_base = '#ffffff';
		over_base_focus ='#ffffff';
		panel = '#666666';
		line = '#303030';
		currIsDay = false;
	}

	over_base_two = over_base_two ? over_base_two : over_base;

	document.documentElement.style.setProperty('--base-color', base);
	document.documentElement.style.setProperty('--base-two-color', base_two);
	document.documentElement.style.setProperty('--base-focus-color', base_focus);
	document.documentElement.style.setProperty('--over-base-color', over_base);
	document.documentElement.style.setProperty('--over-base-two-color', over_base_two);
	document.documentElement.style.setProperty('--over-base-focus-color', over_base_focus);
	document.documentElement.style.setProperty('--panel-color', panel);
	document.documentElement.style.setProperty('--line-color', line);
	document.documentElement.style.setProperty('--border-color', currIsDay ? 'var(--primary-dark-color' : 'transparent');

	storeCookie("is_day", is_day);

}

function changeTheme() {
	
	setTheme(currTheme + 1 <= NUM_THEMES ? currTheme + 1 : 1);

	// play pop sound
	var audio = document.createElement("audio");
	audio.src = "/audio/pop_sfx";
    audio.volume = 0.4;
    audio.play(); 
}

function setTheme(theme_num) {

	//console.log("setting theme to " + theme_num);

	var prim, prim_light, prim_dark, base, base_two, base_focus, over_base, over_base_two, over_base_focus, accent;

	if (theme_num == null) {
		setTheme(1);
		return;
	}

	switch (theme_num) {

		// THEME NUM BASE-PRIMARY-ACCENT

		// THEME 1 DARK-BLUE-YELLOW
		case 1:
			prim = '#38c9ff';
			prim_light = '#91e0ff';
			prim_dark = '#00b9ff';
			accent = '#ffbb00'; 
			break;

		// THEME 2 DARK-MAROON-RED
		case 2:
			prim = '#d80059';
			prim_light = '#d80059';
			prim_dark = '#aa0046';
			accent = '#ff1443'; 
			break;

		// THEME 3 LIGHT-BLUE-PINK
		case 3:
			prim = '#0079e5';
			prim_light = '#0079e5';
			prim_dark = '#004684';
			accent = '#e01f4f'; 
			break;

		// THEME 4 LIGHT-GREEN-BLUE
		case 4:

			prim = '#00d11b';
			prim_light = '#00d11b';
			prim_dark = '#00b516';
			accent = '#42ccff'; 
			break;


		/*
		// THEME 5 AQUA-BLACK-NAVY
		case 5:

			prim = '#353535';
			prim_light = '#353535';
			prim_dark = '#353535';
			base = '#42ccff';
			base_two = '#f9f9f9';
			base_focus = '#f9f9f9';
			over_base = '#ffffff';
			over_base_two = '#353535';
			over_base_focus ='#42ccff';
			accent = '#004f7c'; 
			break;

		case 6:

			prim = '#262626';
			prim_light = '#262626';
			prim_dark = '#262626';
			base = '#cc0025';
			base_two = '#f9f9f9';
			base_focus = '#f9f9f9';
			over_base = '#ffffff';
			over_base_two = '#262626';
			over_base_focus ='#cc0025';
			accent = '#4c0015'; 
			break;*/

		default:
			return;
	}

	over_base_two = over_base_two ? over_base_two : over_base;

	document.documentElement.style.setProperty('--primary-color', prim);
	document.documentElement.style.setProperty('--primary-light-color', prim_light);
	document.documentElement.style.setProperty('--primary-dark-color', prim_dark);
	document.documentElement.style.setProperty('--accent-color', accent);

	currTheme = theme_num;
	storeCookie("theme_num", theme_num);
}