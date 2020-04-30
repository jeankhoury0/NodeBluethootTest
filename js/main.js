addEventListener('DOMContentLoaded', function () {
    var btn_scan = document.getElementById('btn_scan');
    btn_scan.addEventListener('click', function () {
        app.findProxies();
    });

    var demo_page = document.getElementById('demo_page');
    if (demo_page != undefined) {
        addEventListener('beforeunload', function () {
            app.disconnect();
        });
    }

    var btn_connection = document.getElementById('btn_connection');
    btn_connection.addEventListener('click', function () {
        app.connection();
    });

    var btn_submit = document.getElementById('btn_submit');
    if (btn_submit != undefined) {
        btn_submit.addEventListener('click', function () {
            app.pduControllerSubmit();
        });
    }

    var btn_submit2 = document.getElementById('btn_submit2');
    if (btn_submit2 != undefined) {
        btn_submit2.addEventListener('click', function () {
            app.submitPdu();
        });
    }

    var select_sar = document.getElementById('sar_selection');
    select_sar.addEventListener('change', function () {
        app.onSarSelect(this);
    });

    var msg_type = document.getElementById('msg_type');
    msg_type.addEventListener('change', function () {
        app.onMsgTypeSelect(this);
    });

    var opcode_selection = document.getElementById('opcode_selection');
    opcode_selection.addEventListener('change', function () {
        app.onOpcodeSelect(this);
    });

    var onoff_selection = document.getElementById('onoff_selection');
    if (onoff_selection != undefined) {
        onoff_selection.addEventListener('change', function () {
            app.onOnOffSelect(this);
        });
    }

    var onoff_choice_on = document.getElementById('onoff_choice_on');
    if (onoff_choice_on != undefined) {
        onoff_choice_on.addEventListener('change', function () {
            app.onOnOffChoice(this);
        });
    }
    var onoff_choice_off = document.getElementById('onoff_choice_off');
    if (onoff_choice_off != undefined) {
        onoff_choice_off.addEventListener('change', function () {
            app.onOnOffChoice(this);
        });
    }

    var btn_on = document.getElementById('btn_on');
    if (btn_on != undefined) {
        btn_on.addEventListener('click', function () {
            app.sendSetOn(this);
        });
    }

    var btn_off = document.getElementById('btn_off');
    if (btn_off != undefined) {
        btn_off.addEventListener('click', function () {
            app.sendSetOff(this);
        });
    }

    for (var i=1;i<9;i++) {
        var btn_colour = document.getElementById('colour_'+i.toString());
        if (btn_colour != undefined) {
            btn_colour.addEventListener('click', function () {
                app.sendSetHsl(this);
            });
        }
    }

    var access_payload_input = document.getElementById('access_payload_hex');
    access_payload_input.addEventListener('change', function () {
        app.onAccessPayloadChanged();
    });

    var netkey_input = document.getElementById('netkey');
    netkey_input.addEventListener('change', function () {
        app.onNetKeyChanged();
    });

    var appkey_input = document.getElementById('appkey');
    appkey_input.addEventListener('change', function () {
        app.onAppKeyChanged();
    });

    var iv_index_input = document.getElementById('iv_index');
    iv_index_input.addEventListener('change', function () {
        app.onIvIndexChanged();
    });

    var ttl_input = document.getElementById('ttl');
    ttl_input.addEventListener('change', function () {
        app.onTtlChanged();
    });

    var src_input = document.getElementById('src');
    src_input.addEventListener('change', function () {
        app.onSrcChanged();
    });

    var dst_input = document.getElementById('dst');
    dst_input.addEventListener('change', function () {
        app.onDstChanged();
    });

    var select_sar = document.getElementById('sar_selection');
    select_sar.addEventListener('change', function () {
        app.onSarSelect(this);
    });

    var mtu = document.getElementById('mtu');
    mtu.addEventListener('change', function () {
        app.onMtuChanged(this);
    });

    var grid_select = document.getElementById('whole-grid');
    if (grid_select != undefined) {
        grid_select.addEventListener('click', function (event) {
            app.addressSelected(this, event);
        });
    }

    var panel1 = document.getElementById('panel1');
    if (panel1 != undefined) {
        panel1.addEventListener('click', function (event) {
            app.addressSelected(this, event);
        });
    }

    var col_selector;
    for (var i = 1; i < 9; i++) {
        var id = 'C' + i + '_TOP';
        col_selector = document.getElementById(id);
        if (col_selector != undefined) {
            col_selector.addEventListener('click', function (event) {
                app.addressSelected(this, event);
            });
        }
        var id = 'C' + i + '_BOTTOM';
        col_selector = document.getElementById(id);
        if (col_selector != undefined) {
            col_selector.addEventListener('click', function (event) {
                app.addressSelected(this, event);
            });
        }
        var id = 'R' + i + '_LEFT';
        col_selector = document.getElementById(id);
        if (col_selector != undefined) {
            col_selector.addEventListener('click', function (event) {
                app.addressSelected(this, event);
            });
        }
        var id = 'R' + i + '_RIGHT';
        col_selector = document.getElementById(id);
        if (col_selector != undefined) {
            col_selector.addEventListener('click', function (event) {
                app.addressSelected(this, event);
            });
        }
    }

    var node;
    for (var i = 1; i < 65; i++) {
        var id = 'NODE_' + i;
        node = document.getElementById(id);
        if (node != undefined) {
            node.addEventListener('click', function (event) {
                app.addressSelected(this, event);
            });
        }
    }

    var btn_on_off = document.getElementById('btn_on_off');
    if (btn_on_off != undefined) {
        btn_on_off.addEventListener('click', function (event) {
            app.onOffTab();
        });
    }
    var btn_colour = document.getElementById('btn_colour');
    if (btn_colour != undefined) {
        btn_colour.addEventListener('click', function (event) {
            app.colourTab();
        });
    }
})