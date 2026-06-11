import React, { FunctionComponent, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

interface IProps {
    onChange: (input: string) => void;
    keyboardRef: React.RefObject<typeof Keyboard | null>;
}

const KeyboardWrapper: FunctionComponent<IProps> = ({ onChange, keyboardRef }) => {
    const [layoutName, setLayoutName] = useState("default");

    const onKeyPress = (button: string) => {
        if (button === "{shift}" || button === "{lock}") {
            setLayoutName(prev => (prev === "default" ? "shift" : "default"));
        }
        if (button === "{numbers}" || button === "{abc}") {
            setLayoutName(prev => (prev === "numbers" ? "default" : "numbers"));
        }
    };

    return (
        <div className="phone-keyboard-wrapper">
            <Keyboard
                keyboardRef={r => {
                    (keyboardRef as React.RefObject<typeof Keyboard | null>).current = r ?? null;
                }}
                layoutName={layoutName}
                onChange={onChange}
                onKeyPress={onKeyPress}
                layout={{
                    default: [
                        "q w e r t y u i o p",
                        "a s d f g h j k l",
                        "{shift} z x c v b n m {bksp}",
                        "{numbers} {space} {enter}"
                    ],
                    shift: [
                        "Q W E R T Y U I O P",
                        "A S D F G H J K L",
                        "{shift} Z X C V B N M {bksp}",
                        "{numbers} {space} {enter}"
                    ],
                    numbers: [
                        "1 2 3 4 5 6 7 8 9 0",
                        "- / : ; ( ) $ & @ \"",
                        "{abc} . , ? ! ' {bksp}",
                        "{abc} {space} {enter}"
                    ]
                }}
                display={{
                    "{bksp}": "⌫",
                    "{enter}": "return",
                    "{shift}": "⇧",
                    "{space}": " ",
                    "{numbers}": "123",
                    "{abc}": "ABC",
                    "{lock}": "⇪"
                }}
                theme="hg-theme-default phone-keyboard-theme"
                buttonTheme={[
                    {
                        class: "hg-button-action",
                        buttons: "{bksp} {enter} {shift} {lock} {numbers} {abc}"
                    },
                    {
                        class: "hg-button-space",
                        buttons: "{space}"
                    },
                    {
                        class: "hg-button-enter",
                        buttons: "{enter}"
                    }
                ]}
            />
            <style>{`
                .phone-keyboard-wrapper {
                    width: 100%;
                    max-width: 500px;
                    margin: 0 auto;
                    user-select: none;
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme {
                    background-color: #adb5bd;
                    border-radius: 12px;
                    padding: 10px 4px 14px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                    border: none;
                    box-shadow: none;
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-row {
                    margin-bottom: 8px;
                    display: flex;
                    justify-content: center;
                    gap: 6px;
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-row:last-child {
                    margin-bottom: 0;
                }

                /* All keys base style */
                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button {
                    background: #ffffff;
                    color: #000000;
                    border: none;
                    border-radius: 5px;
                    box-shadow: 0 1px 0 0 #8a8f96, 0 2px 0 0 rgba(0,0,0,0.35);
                    font-size: 17px;
                    font-weight: 400;
                    height: 42px;
                    min-width: 32px;
                    flex: 1;
                    max-width: 46px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.08s;
                    padding: 0;
                    letter-spacing: 0;
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button:active,
                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-activeButton {
                    background: #e5e7ea;
                    box-shadow: none;
                }

                /* Action keys (shift, bksp, numbers, abc) */
                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-button-action {
                    background: #adb5bd;
                    color: #000000;
                    font-size: 14px;
                    flex: 1.5;
                    max-width: 56px;
                    box-shadow: 0 1px 0 0 #7a8088, 0 2px 0 0 rgba(0,0,0,0.35);
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-button-action:active {
                    background: #c8cdd3;
                    box-shadow: none;
                }

                /* Space bar */
                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-button-space {
                    flex: 6;
                    max-width: 260px;
                    font-size: 15px;
                    color: #555;
                    background: #ffffff;
                }

                /* Return/Enter key */
                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-button-enter {
                    background: #adb5bd;
                    flex: 2.5;
                    max-width: 90px;
                    font-size: 13px;
                    box-shadow: 0 1px 0 0 #7a8088, 0 2px 0 0 rgba(0,0,0,0.35);
                }

                .phone-keyboard-wrapper .hg-theme-default.phone-keyboard-theme .hg-button.hg-button-enter:active {
                    background: #c8cdd3;
                    box-shadow: none;
                }
            `}</style>
        </div>
    );
};

export default KeyboardWrapper;