var selected_device = null;
var connected = false;
var connected_server;

// cached characteristics
var mesh_proxy_data_in;
var mesh_proxy_data_out;
var app = {};

app.MESH_PROXY_SERVICE = '00001828-0000-1000-8000-00805f9b34fb';
app.MESH_PROXY_DATA_IN = '00002add-0000-1000-8000-00805f9b34fb';
app.MESH_PROXY_DATA_OUT = '00002ade-0000-1000-8000-00805f9b34fb';

var has_mesh_proxy_service = false;
var has_mesh_proxy_data_out = false;
var has_mesh_proxy_data_in = false;
var valid_pdu = false;

// these variables are unique to my network
var iv_index = "00000000";
var netkey = "afc3270eda8802f72c1e532438a979eb";
var appkey = "422bf456f5f3e6b7c5e9006a022b6d8e ";

var encryption_key = "";
var privacy_key = "";
var network_id = "";

var sar = 0;
var msg_type = 0;
// network PDU fields
var ivi = 0;
var nid = "00";
var ctl = 0;
var ttl = "03";
var seq = 0;
var src = "";
var dst = "";
var seg = 0;
var akf = 1;
var aid = "00";
var opcode;
var opparams;
var access_payload;
var transmic;
var netmic;

var mtu = 33;

var proxy_pdu;

var msg;

var tid = 1;
var tid_used = false;

var has_transition_time = false;

/*
BLACK   : HSL(    0,    0,    0) = RGB(0,0,0)

RED     : HSL(    0,65535,32767) = RGB(255,0,0)

GREEN   : HSL(21845,65535,32767) = RGB(0,255,0)

BLUE    : HSL(43690,65535,32767) = RGB(0,0,255)

YELLOW  : HSL(10922,65535,32767) = RGB(255,255,0)

MAGENTA : HSL(54613,65535,32767) = RGB(255,0,255)

CYAN    : HSL(32768,65535,32767) = RGB(0,255,255)

WHITE   : HSL(    0,    0,65535) = RGB(255,255,255)
*/

var colours = [{id:'colour_1',h:0,s:0,l:65535},
               {id:'colour_2',h:0,s:65535,l:32767},
               {id:'colour_3',h:21845,s:65535,l:32767},
               {id:'colour_4',h:43690,s:65535,l:32767},
               {id:'colour_5',h:10922,s:65535,l:32767},
               {id:'colour_6',h:32768,s:65535,l:32767},
               {id:'colour_7',h:54613,s:65535,l:32767},
               {id:'colour_8',h:0,s:0,l:0}
            ];

var selected_onoff = '01';
var selected_colour = colours[0];
var selected_opcode = '8203';

app.initialize = function () {
    console.log("Initialising");
    N = utils.normaliseHex(netkey);
    P = "00";
    A = utils.normaliseHex(appkey);
    k2_material = crypto.k2(netkey, "00");
    hex_encryption_key = k2_material.encryption_key;
    hex_privacy_key = k2_material.privacy_key;
    hex_nid = k2_material.NID;
    network_id = crypto.k3(netkey);
    aid = crypto.k4(appkey);
    I = utils.normaliseHex(iv_index);
    console.log("calculating LSB of iv index: " + I);
    ivi = utils.leastSignificantBit(parseInt(I, 16));
    msg = document.getElementById('message');
    document.getElementById("nid").innerHTML = "0x" + nid;
    document.getElementById("aid").innerHTML = "0x" + aid;
    document.getElementById("encryption_key").innerHTML = "0x" + hex_encryption_key;
    document.getElementById("privacy_key").innerHTML = "0x" + hex_privacy_key;
    document.getElementById("network_id").innerHTML = "0x" + network_id;
    document.getElementById("seq").value = "0x000000";
    document.getElementById("ivi").innerHTML = "0b" + ivi.toString();
    app.hideElement("access_payload_section");
    selected_device = null;
    app.setBluetoothButtons();
    app.setMessageButtons();
    app.restoreSEQ();
    app.deriveProxyPdu();
};

app.restoreSEQ = function () {
    seq = 0;
    if (typeof (Storage) !== "undefined") {
        var restored_seq = localStorage.getItem('SEQ');
        if (restored_seq != null) {
            seq = parseInt(restored_seq);
        }
        document.getElementById('seq').value = utils.toHex(seq, 3);
    } else {
        alert("Can't restore SEQ value. Replay detection will probably interfere with demo!");
    }
}

app.findProxies = function () {
    if (app.buttonIsDisabled('btn_scan')) {
        return;
    }
    console.log('Scanning....');
    app.startScan();
}


app.startScan = function () {
    console.log("startScan");
    connected = false;
    var options = {
        filters: [{
            services: [0x1828]
        }]
    }
    navigator.bluetooth.requestDevice(options)
        .then(device => {
            console.log('> Name: ' + device.name);
            console.log('> Id: ' + device.id);
            console.log('> Connected: ' + device.gatt.connected);
            selected_device = device;
            console.log(selected_device);
            app.connect();
        })
        .catch(error => {
            app.showMessageRed(error);
            console.log('ERROR: ' + error);
        });
};

app.connect = function () {
    if (connected == false) {
        selected_device.gatt.connect().then(
            function (server) {
                console.log("Connected to " + server.device.id);
                connected = true;
                connected_server = server;
                app.displayConnectionStatus();
                app.setBluetoothButtons();
                selected_device.addEventListener('gattserverdisconnected', app.onDisconnected);
                app.discoverSvcsAndChars()
                    .then(function (result) {
                        console.log("service discovery has completed");
                        if (has_mesh_proxy_service && has_mesh_proxy_data_in) {
                            app.clearMessage();
                        } else {
                            app.showMessageRed("ERROR: connected device does not have the required GATT service and/or mesh proxy data in characteristic");
                        }
                        if (has_mesh_proxy_service && has_mesh_proxy_data_out) {
                            mesh_proxy_data_out.startNotifications().then(_ => {
                                    console.log('mesh_proxy_data_out notifications started');
                                    mesh_proxy_data_out.addEventListener('characteristicvaluechanged',
                                        app.onProxyPduReceived);
                                })
                                .catch(error => {
                                    app.showMessageRed('Error mesh_proxy_data_out.startNotifications: ' + error);
                                });
                        } else {
                            app.showMessageRed("ERROR: connected device does not have the required GATT service and/or mesh proxy data in characteristic");
                        }
                        app.setBluetoothButtons();
                        app.clearMessage();
                    });
            },
            function (error) {
                console.log("ERROR: could not connect - " + error);
                app.showMessageRed("ERROR: could not connect - " + error);
                connected = false;
                app.displayConnectionStatus();
                app.setBluetoothButtons();
            });
    }
}

app.onDisconnected = function () {
    console.log("onDisconnected");
    connected = false;
    app.displayConnectionStatus();
    app.setBluetoothButtons();
};

app.disconnect = function () {
    if (connected) {
        console.log("disconnecting from proxy");
        selected_device.gatt.disconnect();
    }
}

app.connection = function () {
    if (app.buttonIsDisabled('btn_connection')) {
        return;
    }
    if (connected == true) {
        app.disconnect();
    } else {
        app.connect();
    }
}

app.discoverSvcsAndChars = function () {
    return new Promise(function (resolve, reject) {
        console.log("discoverSvcsAndChars server=" + connected_server);
        connected_server.getPrimaryServices()
            .then(services => {
                console.log('Getting Characteristics...');
                has_mesh_proxy_service = false;
                services.forEach(function (service, sv_index, sv_array) {
                    console.log('> Service: ' + service.uuid);
                    if (service.uuid == app.MESH_PROXY_SERVICE) {
                        has_mesh_proxy_service = true;
                    }
                    service.getCharacteristics().then(characteristics => {
                        characteristics.forEach(function (characteristic, ch_index, ch_array) {
                            console.log('>> Characteristic: ' + characteristic.uuid);
                            if (characteristic.uuid == app.MESH_PROXY_DATA_IN) {
                                mesh_proxy_data_in = characteristic;
                                has_mesh_proxy_data_in = true;
                            }
                            if (characteristic.uuid == app.MESH_PROXY_DATA_OUT) {
                                mesh_proxy_data_out = characteristic;
                                has_mesh_proxy_data_out = true;
                            }
                            if ((sv_index === sv_array.length - 1) && (ch_index === ch_array.length - 1)) {
                                console.log("Last characteristic discovered");
                                resolve();
                            }
                        });
                    });
                });
            })
            .catch(error => {
                app.showMessageRed('Error: ' + error);
                console.log('Error: ' + error);
                reject(error);
            });
    });
}

app.onProxyPduReceived = function (event) {
    let value = event.target.value;
    var data = new Uint8Array(value.buffer);
    var data_hex = utils.bytesToHex(data);
    console.log("Received: " + data_hex);
    document.getElementById('pdu_received').innerHTML = data_hex;
}

app.deriveAccessPayload = function () {
    access_payload = "";
    tid_used = false;
    if (selected_opcode == "0000") {
        access_payload = document.getElementById("access_payload_hex").value;
    } else {
        access_payload = selected_opcode;
        // onoff set
        if (access_payload == "8202" || access_payload == "8203") {
            console.log("deriving access payload for generic onoff set: " + selected_onoff);
            access_payload = access_payload + selected_onoff;
            access_payload = access_payload + "01";
            console.log("access payload: " + access_payload);
            tid_used = true;
            // level set
        } else if (access_payload == "8277") {
            console.log("selected_colour="+JSON.stringify(selected_colour));
            // mesh message orders the HSL fields as L/H/S
            access_payload = access_payload + utils.hexToLittleEndian(utils.toHex(selected_colour.l,2))+utils.hexToLittleEndian(utils.toHex(selected_colour.h,2))+utils.hexToLittleEndian(utils.toHex(selected_colour.s,2));
            console.log(access_payload);
            access_payload = access_payload + "01";
            tid_used = true;
        }
        console.log("has_transition_time=" + has_transition_time);
        if (has_transition_time == true) {
            console.log(document.getElementById("trans_time_hex"));
            tt_value = document.getElementById("trans_time_hex").value;
            console.log("has_transition_time, value=" + tt_value);
            if (tt_value != "00") {
                console.log("adding tt and delay to access payload");
                access_payload = access_payload + tt_value;
                access_payload = access_payload + document.getElementById("delay_hex").value;
                console.log("access_payload now = " + access_payload);
            }
        }
    }
    return access_payload;
};

app.deriveSecureUpperTransportPdu = function (access_payload) {
    upper_trans_pdu = {};
    // derive Application Nonce (ref 3.8.5.2)
    app_nonce = "0100" + utils.toHex(seq, 3) + src + dst + iv_index;
    console.log("app_nonce=" + app_nonce);
    upper_trans_pdu = crypto.meshAuthEncAccessPayload(A, app_nonce, access_payload);
    return upper_trans_pdu;
}

app.deriveLowerTransportPdu = function (upper_transport_pdu) {
    lower_transport_pdu = "";
    // seg=0 (1 bit), akf=1 (1 bit), aid (6 bits) already derived from k4
    seg_int = parseInt(seg, 16);
    akf_int = parseInt(akf, 16);
    aid_int = parseInt(aid, 16);
    ltpdu1 = (seg_int << 7) | (akf_int << 6) | aid_int;
    lower_transport_pdu = utils.intToHex(ltpdu1) + upper_transport_pdu.EncAccessPayload + upper_transport_pdu.TransMIC;
    return lower_transport_pdu;
};

app.deriveSecureNetworkLayer = function (hex_dst, lower_transport_pdu) {
    network_pdu = "";
    ctl_int = parseInt(ctl, 16);
    ttl_int = parseInt(ttl, 16);
    ctl_ttl = (ctl_int | ttl_int);
    npdu2 = utils.intToHex(ctl_ttl);
    N = utils.normaliseHex(hex_encryption_key);
    net_nonce = "00" + npdu2 + utils.toHex(seq, 3) + src + "0000" + iv_index;
    network_pdu = crypto.meshAuthEncNetwork(N, net_nonce, hex_dst, lower_transport_pdu);
    return network_pdu;
};

app.obfuscateNetworkPdu = function (network_pdu) {
    obfuscated = "";
    obfuscated = crypto.obfuscate(network_pdu.EncDST, network_pdu.EncTransportPDU, network_pdu.NetMIC, ctl, ttl, utils.toHex(seq, 3), src, iv_index, hex_privacy_key);
    return obfuscated;
};

app.finaliseNetworkPdu = function (ivi, nid, obfuscated_ctl_ttl_seq_src, enc_dst, enc_transport_pdu, netmic) {
    ivi_int = parseInt(ivi, 16);
    nid_int = parseInt(nid, 16);
    npdu1 = utils.intToHex((ivi_int << 7) | nid_int);
    netpdu = npdu1 + obfuscated_ctl_ttl_seq_src + enc_dst + enc_transport_pdu + netmic;
    return netpdu;
};

app.finaliseProxyPdu = function (finalised_network_pdu) {
    proxy_pdu = "";
    sm = (sar << 6) | msg_type;
    i = 0;
    proxy_pdu = proxy_pdu + utils.intToHex(sm);
    proxy_pdu = proxy_pdu + finalised_network_pdu;
    return proxy_pdu;
};

app.deriveProxyPdu = function () {
    console.log("deriveProxyPdu");
    dst = document.getElementById('dst').value;
    src = document.getElementById("src").value;
    valid_pdu = true;
    // access payload
    access_payload = app.deriveAccessPayload();
    console.log("access_payload=" + access_payload);
    document.getElementById("hdg_access_payload_hex").innerHTML = "0x" + access_payload;

    // upper transport PDU
    upper_transport_pdu_obj = app.deriveSecureUpperTransportPdu(access_payload);
    upper_transport_pdu = upper_transport_pdu_obj.EncAccessPayload + upper_transport_pdu_obj.TransMIC;
    console.log("upper_transport_pdu=" + upper_transport_pdu);
    transmic = upper_transport_pdu_obj.TransMIC;
    document.getElementById("trans_mic").innerHTML = "0x" + upper_transport_pdu_obj.TransMIC;

    // derive lower transport PDU
    lower_transport_pdu = app.deriveLowerTransportPdu(upper_transport_pdu_obj);
    console.log("lower_transport_pdu=" + lower_transport_pdu);

    // encrypt network PDU
    secured_network_pdu = app.deriveSecureNetworkLayer(dst, lower_transport_pdu);
    console.log("EncDST=" + JSON.stringify(secured_network_pdu.EncDST) + " EncTransportPDU=" + JSON.stringify(secured_network_pdu.EncTransportPDU));
    netmic = secured_network_pdu.NetMIC;
    document.getElementById("net_mic").innerHTML = "0x" + secured_network_pdu.NetMIC;

    // obfuscate
    obfuscated = app.obfuscateNetworkPdu(secured_network_pdu);
    console.log("obfuscated_ctl_ttl_seq_src=" + JSON.stringify(obfuscated.obfuscated_ctl_ttl_seq_src));

    // finalise network PDU
    finalised_network_pdu = app.finaliseNetworkPdu(ivi, hex_nid, obfuscated.obfuscated_ctl_ttl_seq_src, secured_network_pdu.EncDST, secured_network_pdu.EncTransportPDU, network_pdu.NetMIC);
    console.log("finalised_network_pdu=" + finalised_network_pdu);
    document.getElementById("network_pdu_hex").innerHTML = "0x" + finalised_network_pdu;
    document.getElementById('hdg_network_pdu').innerHTML = "Network PDU - " + (finalised_network_pdu.length / 2) + " octets";

    // finalise proxy PDU
    proxy_pdu = app.finaliseProxyPdu(finalised_network_pdu);
    console.log("proxy_pdu=" + proxy_pdu);
    document.getElementById('proxy_pdu_hex').innerHTML = "0x" + proxy_pdu;
    document.getElementById('hdg_proxy_pdu').innerHTML = "Proxy PDU - " + (proxy_pdu.length / 2) + " octets";

    if (proxy_pdu.length > (mtu * 2)) { // hex chars
        app.showMessageRed("Segmentation required ( PDU length > MTU)");
        alert("Segmentation required ( PDU length > MTU)");
        valid_pdu = false;
        app.disableButton('btn_submit');
    }
}

app.pduControllerSubmit = function () {
    new_level_state = parseInt(utils.hexToLittleEndian(document.getElementById("delta_level_hex").value, 16));
    app.submitPdu();
}

app.submitPdu = function () {
    if (!connected) {
        alert("Please connect to a proxy node");
        return;
    }
    if (!has_mesh_proxy_data_in) {
        app.showMessageRed("Error: mesh_proxy_data_in characteristic not discovered");
        console.log("Error: mesh_proxy_data_in characteristic not discovered");
        return;
    }
    
    
    seq = parseInt(document.getElementById('seq').value, 16);

    app.deriveProxyPdu();
    if (!valid_pdu) {
        app.showMessageRed("Error: PDU is not valid");
        console.log("Error: PDU is not valid");
        return;
    }

    proxy_pdu_bytes = utils.hexToBytes(proxy_pdu);
    console.log("writing: " + proxy_pdu_bytes);
    proxy_pdu_data = new Uint8Array(proxy_pdu_bytes)
    mesh_proxy_data_in.writeValue(proxy_pdu_data.buffer)
        .then(_ => {
            console.log('sent proxy pdu OK');
            app.showStatusTimed("message sent OK", 3000)
        })
        .catch(error => {
            alert('Error: ' + error);
            app.showMessageRed('Error: ' + error);
            console.log('Error: ' + error);
            return;
        });

    seq = seq + 1;
    document.getElementById('seq').value = utils.toHex(seq, 3);
    localStorage.setItem('SEQ', seq.toString());
    console.log("tid_used=" + tid_used);
    if (tid_used == true) {
        tid = tid + 1;
        if (tid > 255) {
            tid = 1;
        }
    }
    
}

app.displayConnectionStatus = function () {
    if (connected) {
        document.getElementById('bluetooth_status').innerHTML = "CONNECTED";
        devname = "";
        if (selected_device.name != undefined) {
            devname = selected_device.name + " --> ";
        }
        document.getElementById('selected_device').innerHTML = devname + selected_device.id;
    } else {
        document.getElementById('bluetooth_status').innerHTML = "DISCONNECTED";
    }
}

app.setBluetoothButtons = function () {
    console.log("setBluetoothButtons: connected=" + connected + ",selected_device=" + selected_device);
    btn_connection = document.getElementById('btn_connection');
    if (connected == false && selected_device == null) {
        btn_connection.innerHTML = "Connect";
        app.enableButton('btn_scan');
        app.disableButton('btn_connection');
        app.disableButton('btn_submit');
        return;
    }
    if (connected == false && selected_device != null) {
        btn_connection.innerHTML = "Connect";
        app.enableButton('btn_scan');
        app.enableButton('btn_connection');
        app.disableButton('btn_submit');
        return;
    }
    btn_connection.innerHTML = "Disconnect";
    app.disableButton('btn_scan');
    app.enableButton('btn_connection');
    if (has_mesh_proxy_service && has_mesh_proxy_data_in) {
        app.enableButton('btn_submit');
    }
};

app.setMessageButtons = function () {
    app.selectTab('btn_on_off');
    app.deselectTab('btn_level');
    app.deselectTab('btn_delta');
    app.deselectTab('btn_move');
};


app.clearMessage = function () {
    console.log("clearMessage");
    msg.style.color = "#ffffff";
    msg.innerHTML = "&nbsp;";
    app.showElement(msg);
};

app.showMessage = function (msg_text) {
    msg.style.color = "#ffffff";
    msg.innerHTML = msg_text;
    app.showElement('message');
};

app.showMessageRed = function (msg_text) {
    msg.style.color = "#ff0000";
    msg.innerHTML = msg_text;
    app.showElement('message');
};


app.showStatusTimed = function (msg_text, duration) {
    app.showMessageRed(msg_text);
    setTimeout(function () {
        app.clearMessage();
    }, duration);

};

app.disableButton = function (btn_id) {
    console.log("disableButton: " + btn_id);
    var btn = document.getElementById(btn_id);
    if (btn != undefined) {
        btn.style.color = "gray";
    }
}

app.enableButton = function (btn_id) {
    console.log("enableButton: " + btn_id);
    var btn = document.getElementById(btn_id);
    if (btn != undefined) {
        btn.style.color = "white";
    }
}

app.selectTab = function (btn_id) {
    var btn = document.getElementById(btn_id);
    if (btn != undefined) {
        btn.style.backgroundColor = "#FF0000";
    }
}

app.deselectTab = function (btn_id) {
    var btn = document.getElementById(btn_id);
    if (btn != undefined) {
        btn.style.backgroundColor = "#0082fc";
    }
}

app.isTabSelected = function (btn_id) {
    var btn = document.getElementById(btn_id);
    if (btn != undefined) {
        return (btn.style.backgroundColor == "rgb(255, 0, 0)");
    } else {
        return false;
    }
}

app.setOpcode = function () {
    var opcode = document.getElementById('opcode');
    if (app.tabIsSelected('btn_on_off')) {
        opcode.innerHTML = "8203"
    }
    if (app.tabIsSelected('btn_colour')) {
        opcode.innerHTML = "8277"
    }
    selected_opcode = opcode.innerHTML;
}

app.onAckChanged = function () {
    app.setOpcode();
}

app.setTabPanelVisibility = function () {
    document.getElementById("generic_onoff_params_onoff").hidden = !onoff_set_params_visible;
    document.getElementById("colour_controls").hidden = !colour_controls_visible;
}

app.setLevelField = function (selected_level) {
    var level_band_size = Math.floor(32767 / 25);
    new_level_state = (selected_level * level_band_size) - 1;
    if (new_level_state < 0) {
        new_level_state = 0;
    }
    console.log("level field = " + new_level_state);
    // set delta_level_hex if delta tab showing or level_hex is level or move tabs showing
    if (app.isTabSelected('btn_delta')) {
        console.log("Calculating delta level for delta set operation");
        delta_level_hex = utils.toHex(new_level_state, 4);
        console.log("delta_level_hex=" + delta_level_hex);
    } else if (app.isTabSelected('btn_level') || app.isTabSelected('btn_move')) {
        level_hex = utils.toHex(new_level_state, 2);
        document.getElementById('level_hex').value = level_hex;
        console.log("level_hex=" + level_hex);
    }
}

app.setLevelIndicator = function (selected_level) {
    document.getElementById('level_selected').innerHTML = selected_level;
    for (var i = 1; i < 26; i++) {
        var id = 'level_selection_' + i;
        lev_selection = document.getElementById(id);
        if (lev_selection != undefined) {
            lev_selection.style.backgroundColor = '#000000';
        }
    }
    for (var i = 1; i <= selected_level; i++) {
        var id = 'level_selection_' + i;
        lev_selection = document.getElementById(id);
        if (lev_selection != undefined) {
            lev_selection.style.backgroundColor = '#FF0000';
        }
    }
}

app.onOffTab = function () {
    onoff_set_params_visible = true;
    generic_params_visible = true;
    colour_controls_visible = false;
    access_payload_visible = false;
    has_transition_time = false;
    app.hideElement('btn_submit2');
    app.setTabPanelVisibility();
    if (app.tabIsSelected('btn_on_off')) {
        return;
    }
    app.selectTab('btn_on_off');
    app.deselectTab('btn_colour');
    app.setOpcode();

    app.deriveProxyPdu();
}

app.clearSelectedColour = function(colour_id) {
	console.log('clearSelectedColour('+colour_id+")");
	document.getElementById(colour_id).style.border = "1px solid #808080";
}

app.highlightSelectedColour = function(colour_id) {
	console.log('highlightSelectedColour('+colour_id+")");
	document.getElementById(colour_id).style.border = "5px groove #FF0000";
}

app.colourTab = function () {
    onoff_set_params_visible = false;
    generic_params_visible = true;
    colour_controls_visible = true;
    access_payload_visible = false;
    app.hideElement('btn_submit2');
    if (app.tabIsSelected('btn_colour')) {
        return;
    }
    app.deselectTab('btn_on_off');
    app.selectTab('btn_colour');
    app.setOpcode();
    app.setTabPanelVisibility();
    app.highlightSelectedColour(selected_colour.id);
}


app.tabIsSelected = function (tab_id) {
    var tab = document.getElementById(tab_id);
    return (tab.style.backgroundColor === "rgb(255, 0, 0)");
}

app.buttonIsDisabled = function (btn_id) {
    var btn = document.getElementById(btn_id);
    return (btn.style.color === "gray");
}

app.wrongServices = function () {
    app.showMessageRed("Error: peripheral device is not running the required Bluetooth services");
    selected_device.gatt.disconnect();
}

app.onTtChanged = function () {
    var tt = document.getElementById('trans_time_hex');
    if (tt != undefined && tt.value != '00') {
        has_transition_time = true;
    } else {
        has_transition_time = false;
    }
}

app.onOpcodeSelect = function (selected) {
    selected_opcode = selected.value;
    generic_params_visible = false;
    access_payload_visible = false;
    onoff_set_params_visible = false;
    colour_controls_visible = false;
    has_transition_time = false;

    if (selected.value == "0000") {
        access_payload_visible = true;
    }
    if (selected.value == "8202" || selected.value == "8203") {
        onoff_set_params_visible = true;
        generic_params_visible = true;
    }
    if (selected.value == "8277") {
        colour_controls_visible = true;
        generic_params_visible = true;
    }

    document.getElementById("access_payload_section").hidden = !access_payload_visible;
    document.getElementById("generic_onoff_params_onoff").hidden = !onoff_set_params_visible;
    document.getElementById("colour_controls").hidden = !colour_controls_visible;

    document.getElementById("generic_params_tid").hidden = !generic_params_visible;
    document.getElementById("generic_params_trans_time").hidden = !generic_params_visible;
    document.getElementById("generic_params_delay").hidden = !generic_params_visible;
    app.deriveProxyPdu();
};

app.onNetKeyChanged = function () {
    netkey = document.getElementById("netkey").value;
    k2_material = crypto.k2(netkey, "00");
    hex_encryption_key = k2_material.encryption_key;
    hex_privacy_key = k2_material.privacy_key;
    hex_nid = k2_material.NID;
    network_id = crypto.k3(netkey);
    document.getElementById("nid").innerHTML = "0x" + hex_nid;
    document.getElementById("encryption_key").innerHTML = "0x" + encryption_key;
    document.getElementById("privacy_key").innerHTML = "0x" + privacy_key;
    app.deriveProxyPdu();
};

app.onAppKeyChanged = function () {
    appkey = document.getElementById("appkey").value;
    A = utils.normaliseHex(appkey);
    aid = crypto.k4(appkey);
    document.getElementById("aid").innerHTML = "0x" + aid;
    app.deriveProxyPdu();
};

app.onIvIndexChanged = function () {
    iv_index = document.getElementById("iv_index").value;
    I = utils.normaliseHex(iv_index);
    ivi = utils.leastSignificantBit(parseInt(I, 16));
    document.getElementById("ivi").innerHTML = "0x" + ivi;
    app.deriveProxyPdu();
};

app.onTtlChanged = function () {
    ttl = document.getElementById("ttl").value;
    app.deriveProxyPdu();
};

app.onSrcChanged = function () {
    src = document.getElementById("src").value;
    app.deriveProxyPdu();
};

app.onDstChanged = function () {
    dst = document.getElementById("dst").value
    app.deriveProxyPdu();
};

app.onSarSelect = function (selected) {
    var selected_sar = document.getElementById("sar_selection");
    sar = parseInt(selected_sar.options[selected_sar.selectedIndex].value);
    app.deriveProxyPdu();
};

app.onMsgTypeSelect = function (selected) {
    app.deriveProxyPdu();
};

app.onOnOffSelect = function (selected) {
    selected_onoff = document.getElementById("onoff_selection").value;
    app.deriveProxyPdu();
};

app.onOnOffChoice = function (selected) {
    selected_onoff = selected.value;
    app.deriveProxyPdu();
};

app.sendSetOn = function (selected) {
    selected_onoff = "01";
    app.deriveProxyPdu();
    app.submitPdu();
};

app.sendSetOff = function (selected) {
    selected_onoff = "00";
    app.deriveProxyPdu();
    app.submitPdu();
};

app.sendSetHsl = function (clicked_colour) {
    console.log("sendSetHsl("+clicked_colour.id+")");
    var colour_inx = parseInt(clicked_colour.id.substring(7,8)) - 1;
    app.clearSelectedColour(selected_colour.id);
    selected_colour = colours[colour_inx];
    app.highlightSelectedColour(selected_colour.id);
    app.deriveProxyPdu();
    app.submitPdu();
};

app.onAccessPayloadChanged = function () {
    access_payload = document.getElementById("access_payload_hex").value
    app.deriveProxyPdu();
};

app.onTidChange = function (selected) {
    app.deriveProxyPdu();
};

app.onTransTimeChange = function (selected) {
    app.deriveProxyPdu();
};

app.onDelayChange = function (selected) {
    app.deriveProxyPdu();
};

app.onMtuChanged = function () {
    mtu = parseInt(document.getElementById("mtu").value);
    app.deriveProxyPdu();
};

app.addressSelected = function (element, event) {
    console.log("target selected : " + element.id);
    event.stopImmediatePropagation();
    var address = addresses[element.id];
    console.log("address : " + address);
    document.getElementById('dst').value = address;
    if (element.id == 'whole-grid') {
        highlightWholeGrid();
    } else if (element.id.startsWith('panel')) {
        highlightPanel(element.id);
    } else if (element.id.startsWith('R')) {
        highlightRow(element.id);
    } else if (element.id.startsWith('C')) {
        highlightCol(element.id);
    } else {
        highlightNode(element.id);
    }
}

app.levelSelected = function (element, event) {
    event.stopImmediatePropagation();
    selected_level = parseInt(element.id.substring(16));
    console.log("level selected:" + selected_level);
    document.getElementById('level_selected').innerHTML = selected_level;
    app.setLevelIndicator(selected_level);
    app.setLevelField(selected_level);
    app.deriveProxyPdu();
    if (app.tabIsSelected('btn_level')) {
        app.submitPdu();
    }
}

app.onLevelClear = function () {
    selected_level = 0;
    document.getElementById('level_selected').innerHTML = selected_level;
    app.setLevelIndicator(selected_level);
    app.setLevelField(selected_level);
    app.deriveProxyPdu();
    if (app.tabIsSelected('btn_level') || app.tabIsSelected('btn_move')) {
        app.submitPdu();
    }
}

app.updateTransitionTime = function () {
    resolution_ms = 100;
    console.log('updateTransitionTime: step_resolution=' + step_resolution);
    switch (step_resolution) {
        case 0:
            resolution_ms = 100;
            break;
        case 1:
            resolution_ms = 1000;
            break;
        case 2:
            resolution_ms = 10000;
            break;
        case 3:
            resolution_ms = 600000;
            break;
    }
    console.log('resolution_ms=' + resolution_ms);
    move_duration = steps * resolution_ms;
    console.log('move_duration=' + move_duration);
    var move_duration_display = move_duration;
    var move_duration_units = 'ms';
    if (move_duration > 1000) {
        move_duration_display = move_duration / 1000;
        move_duration_units = 's';
    }
    document.getElementById('move_duration').innerHTML = move_duration_display + move_duration_units;

    trans_time = (step_resolution << 6) | steps;
    console.log('trans_time=' + trans_time);
    document.getElementById('transition_time').innerHTML = Number(trans_time).toString(16);
    document.getElementById('trans_time_hex').value = Number(trans_time).toString(16);
}

app.onStepResolutionChanged = function () {
    step_resolution_selection = document.getElementById('step_resolution_selection');
    step_resolution = parseInt(step_resolution_selection.options[step_resolution_selection.selectedIndex].value);
    console.log('step resolution=' + step_resolution);
    app.updateTransitionTime();
}

app.onStepsChanged = function () {
    steps_hex = document.getElementById('trans_time_steps_hex').value;
    steps = parseInt(steps_hex, 16);
    console.log('steps=' + steps);
    app.updateTransitionTime();
}

app.hideElement = function (id) {
    var element = document.getElementById(id);
    if (element != undefined) {
        element.style.display = "none";
    }
}

app.showElement = function (id) {
    var element = document.getElementById(id);
    if (element != undefined) {
        element.style.display = "block";
    }
}