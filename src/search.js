const Me = imports.misc.extensionUtils.getCurrentExtension();

const { current_monitor, recursive_remove_children } = Me.imports.lib;
const { Clutter, GObject, Pango, St } = imports.gi;
const { ModalDialog } = imports.ui.modalDialog;
const ShellEntry = imports.ui.shellEntry;

var Search = GObject.registerClass(
    class Search extends ModalDialog {
        _init(cancel, search, select, apply) {
            super._init({
                styleClass: 'pop-shell-search',
                destroyOnClose: false,
                shellReactive: true,
                shouldFadeIn: false,
                shouldFadeOut: false,
            });

            this.search = search;
            this.active_id = 0;
            this.widgets = [];

            this.entry = new St.Entry({
                can_focus: true,
                x_expand: true,
            });

            // ShellEntry.addContextMenu(this.entry);
            this.text = this.entry.clutter_text;
            this.setInitialKeyFocus(this.text)

            this.text.connect('activate', (_) => {
                if (this.active_id < this.widgets.length) {
                    apply(this.active_id);
                }

                this.reset();
                this.popModal();
                this.close();
            });

            this.text.connect('text-changed', (entry, _) => {
                this.clear();

                let text = entry.get_text();
                this.update_search_list(search(text.toLowerCase()));
            });

            this.text.connect('key-press-event', (_, event) => {
                // Prevents key repeat events
                if (event.get_flags() != Clutter.EventFlags.NONE) {
                    return;
                }

                let c = event.get_key_code();
                if (c == 9) {
                    // Escape key was pressed
                    this.reset();
                    this.popModal();
                    this.close();
                    cancel();
                    return;
                } else if (c == 111) {
                    // Up arrow was pressed
                    if (0 < this.active_id) {
                        this.unselect();
                        this.active_id -= 1;
                        this.select();
                    }
                } else if (c == 116) {
                    // Down arrow was pressed
                    if (this.active_id + 1 < this.widgets.length) {
                        this.unselect();
                        this.active_id += 1;
                        this.select();
                    }
                }
                
                select(this.active_id);
            });

            this.list = new St.BoxLayout({
                styleClass: 'pop-shell-search-list',
                vertical: true,
                margin_top: 12,
            });

            this.contentLayout.add(this.entry);
            this.contentLayout.add(this.list);
            this.contentLayout.width = current_monitor().width / 4;
        }

        clear() {
            recursive_remove_children(this.list);
            this.list.hide();
            this.widgets = [];
            this.active_id = 0;
        }

        reset() {
            this.clear();
            this.text.set_text(null);
        }

        show() {
            this.show_all();
            this.clear();
            this.entry.grab_key_focus();
            this.update_search_list(this.search(''));
        }

        select() {
            this.widgets[this.active_id].set_style_class_name('pop-shell-search-element pop-shell-search-active');
        }

        unselect() {
            this.widgets[this.active_id].set_style_class_name('pop-shell-search-element');
        }

        update_search_list(list) {
            for (const element of list) {
                const [title, icon] = element;

                let label = new St.Label({
                    text: title,
                    styleClass: 'pop-shell-search-label'
                });

                label.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);

                let container = new St.BoxLayout({
                    styleClass: 'pop-shell-search-element',
                });

                container.add(icon, { y_fill: false, y_align: St.Align.MIDDLE });
                container.add(label, { y_fill: false, y_align: St.Align.MIDDLE });

                if (this.widgets.length != 0) {
                    this.list.add(new St.BoxLayout({ styleClass: 'pop-shell-separator', x_expand: true }));
                }

                this.widgets.push(container);
                this.list.add(container);
            }

            this.list.show();
            if (this.widgets.length != 0) {
                this.select();
            }
        }
    }
);