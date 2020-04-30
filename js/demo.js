var addresses = {
	'whole-grid': 'FFFF',
	'panel1': 'C001',
	'panel2': 'C002',
	'panel3': 'C003',
	'panel4': 'C004',
	'R1_LEFT': 'C011',
	'R2_LEFT': 'C012',
	'R3_LEFT': 'C013',
	'R4_LEFT': 'C014',
	'R5_LEFT': 'C015',
	'R6_LEFT': 'C016',
	'R7_LEFT': 'C017',
	'R8_LEFT': 'C018',
	'R1_RIGHT': 'C011',
	'R2_RIGHT': 'C012',
	'R3_RIGHT': 'C013',
	'R4_RIGHT': 'C014',
	'R5_RIGHT': 'C015',
	'R6_RIGHT': 'C016',
	'R7_RIGHT': 'C017',
	'R8_RIGHT': 'C018',
	'C1_TOP': 'C021',
	'C2_TOP': 'C022',
	'C3_TOP': 'C023',
	'C4_TOP': 'C024',
	'C5_TOP': 'C025',
	'C6_TOP': 'C026',
	'C7_TOP': 'C027',
	'C8_TOP': 'C028',
	'C1_BOTTOM': 'C021',
	'C2_BOTTOM': 'C022',
	'C3_BOTTOM': 'C023',
	'C4_BOTTOM': 'C024',
	'C5_BOTTOM': 'C025',
	'C6_BOTTOM': 'C026',
	'C7_BOTTOM': 'C027',
	'C8_BOTTOM': 'C028',
	'NODE_1': '0001',
	'NODE_2': '0002',
	'NODE_3': '0003',
	'NODE_4': '0004',
	'NODE_5': '0005',
	'NODE_6': '0006',
	'NODE_7': '0007',
	'NODE_8': '0008',
	'NODE_9': '0009',
	'NODE_10': '000A',
	'NODE_11': '000B',
	'NODE_12': '000C',
	'NODE_13': '000D',
	'NODE_14': '000E',
	'NODE_15': '000F',
	'NODE_16': '0010',
	'NODE_17': '0011',
	'NODE_18': '0012',
	'NODE_19': '0013',
	'NODE_20': '0014',
	'NODE_21': '0015',
	'NODE_22': '0016',
	'NODE_23': '0017',
	'NODE_24': '0018',
	'NODE_25': '0019',
	'NODE_26': '001A',
	'NODE_27': '001B',
	'NODE_28': '001C',
	'NODE_29': '001D',
	'NODE_30': '001E',
	'NODE_31': '001F',
	'NODE_32': '0020',
	'NODE_33': '0021',
	'NODE_34': '0022',
	'NODE_35': '0023',
	'NODE_36': '0024',
	'NODE_37': '0025',
	'NODE_38': '0026',
	'NODE_39': '0027',
	'NODE_40': '0028',
	'NODE_41': '0029',
	'NODE_42': '002A',
	'NODE_43': '002B',
	'NODE_44': '002C',
	'NODE_45': '002D',
	'NODE_46': '002E',
	'NODE_47': '002F',
	'NODE_48': '0030',
	'NODE_49': '0031',
	'NODE_50': '0032',
	'NODE_51': '0033',
	'NODE_52': '0034',
	'NODE_53': '0035',
	'NODE_54': '0036',
	'NODE_55': '0037',
	'NODE_56': '0038',
	'NODE_57': '0039',
	'NODE_58': '003A',
	'NODE_59': '003B',
	'NODE_60': '003C',
	'NODE_61': '003D',
	'NODE_62': '003E',
	'NODE_63': '003F',
	'NODE_64': '0040',
};

var selected_id = "";

function deselect() {
	if (selected_id != "") {
		if (selected_id.startsWith('R')) {
			var row = parseInt(selected_id.substring(1, 2));
			for (var i = 1; i < 5; i++) {
				var node_number = ((row - 1) * 4) + i;
				var node_id = 'NODE_' + node_number;
				document.getElementById(node_id).style.border = "1px solid #FFFFFF";
			}
		} else if (selected_id.startsWith('C')) {
			var col = parseInt(selected_id.substring(1, 2));
			for (var i = 1; i < 5; i++) {
				var node_number = ((i - 1) * 4) + col;
				var node_id = 'NODE_' + node_number;
				document.getElementById(node_id).style.border = "1px solid #FFFFFF";
			}
		} else {
			document.getElementById(selected_id).style.border = "1px solid #FFFFFF";
		}
	}
}

function highlightWholeGrid() {
	console.log('highlightWholeGrid');
	deselect();
	document.getElementById("whole-grid").style.border = "5px groove #FF0000";
	selected_id = "whole-grid";
}

function highlightPanel(panel_id) {
	console.log('highlightPanel(' + panel_id + ')');
	deselect();
	document.getElementById(panel_id).style.border = "5px groove #FF0000";
	selected_id = panel_id;
}

function highlightRow(row_id) {
	console.log('highlightRow(' + row_id + ')');
	var row = parseInt(row_id.substring(1, 2));
	deselect();
	selected_id = row_id;
	for (var i = 1; i < 5; i++) {
		var node_number = ((row - 1) * 4) + i;
		var node_id = 'NODE_' + node_number;
		document.getElementById(node_id).style.border = "5px groove #FF0000";
	}
}

function highlightCol(col_id) {
	console.log('highlightCol(' + col_id + ')');
	var col = parseInt(col_id.substring(1, 2));
	deselect();
	selected_id = col_id;
	for (var i = 1; i < 5; i++) {
		var node_number = ((i - 1) * 4) + col;
		var node_id = 'NODE_' + node_number;
		document.getElementById(node_id).style.border = "5px groove #FF0000";
	}
}

function highlightNode(node_id) {
	console.log('highlightNode(' + node_id + ')');
	deselect();
	document.getElementById(node_id).style.border = "5px groove #FF0000";
	selected_id = node_id;
}