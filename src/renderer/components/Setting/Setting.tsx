import React from 'react';
import { DistractingRow, TimerActionTypes, TimerState } from '../Timer/action';
import styled from 'styled-components';
import {
    Button,
    Col,
    Icon,
    message,
    Modal,
    notification,
    Popconfirm,
    Row,
    Slider,
    Switch
} from 'antd';
import { deleteAllUserData, exportDBData } from '../../monitor/sessionManager';
import { writeFile } from 'fs';
import { shell, remote, app } from 'electron';
import { promisify } from 'util';
import { DistractingList, DistractingListModalButton } from './DistractingList';
import { isShallowEqualByKeys } from '../../utils';

const dialog = remote.dialog;

const Container = styled.div`
    padding: 12px 36px;
`;

const SliderContainer = styled.div`
    padding: 4px 24px;
`;

const ButtonWrapper = styled.div`
    margin: 0.6em;
`;

const StyledIcon = styled(Icon)`
    font-size: 2.5rem;
    color: black;
    transition: color 0.1s;
    :hover {
        color: rgb(87, 80, 89);
    }
`;

const marks = {
    25: '25min',
    35: '35min',
    45: '45min'
};

const restMarks = {
    5: '5min',
    10: '10min'
};

const longBreakMarks = {
    10: '10min',
    15: '15min',
    20: '20min'
};

const settingUiStates = [
    'focusDuration',
    'restDuration',
    'longBreakDuration',
    'monitorInterval',
    'screenShotInterval',
    'startOnBoot',
    'distractingList'
];

interface Props extends TimerState, TimerActionTypes {}
export const Setting: React.FunctionComponent<Props> = React.memo(
    (props: Props) => {
        const onChangeFocus = React.useCallback((v: number | [number, number]) => {
            if (v instanceof Array) {
                return;
            }

            props.setFocusDuration(v * 60);
        }, []);

        const onChangeRest = React.useCallback((v: number | [number, number]) => {
            if (v instanceof Array) {
                return;
            }

            props.setRestDuration(v * 60);
        }, []);

        const onChangeLongBreak = React.useCallback((v: number | [number, number]) => {
            if (v instanceof Array) {
                return;
            }

            props.setLongBreakDuration(v * 60);
        }, []);

        const switchScreenshot = React.useCallback((v: boolean) => {
            if (v) {
                props.setScreenShotInterval(1000 * 60 * 5);
            } else {
                props.setScreenShotInterval(undefined);
            }

            notification.open({
                message: 'Restart App to Apply Changes',
                description: 'Screenshot setting change needs restart to be applied',
                duration: 0,
                icon: <Icon type="warning" />
            });
        }, []);

        const setStartOnBoot = React.useCallback((v: boolean) => {
            props.setStartOnBoot(v);
            if (v) {
                app.setLoginItemSettings({
                    openAtLogin: true,
                    openAsHidden: true
                });
            } else {
                app.setLoginItemSettings({
                    openAtLogin: false
                });
            }
        }, []);

        function onDeleteData() {
            deleteAllUserData().then(() => {
                message.info('All user data is removed. Pomodoro needs to restart.');
            });
        }

        async function onExportingData() {
            const { canceled, filePath } = await dialog.showSaveDialog(remote.getCurrentWindow(), {
                title: 'Pomodoro Data Export',
                defaultPath: 'pomodoroDB.dat',
                filters: [
                    {
                        name: 'Data File',
                        extensions: ['dat']
                    }
                ]
            });

            if (!canceled && filePath) {
                const data = await exportDBData();
                await promisify(writeFile)(filePath, JSON.stringify(data), { encoding: 'utf-8' });
                message.success('Data Exported');
            }
        }

        function openIssuePage() {
            shell.openExternal('https://github.com/zxch3n/PomodoroLogger/issues/new');
        }

        function openGithubPage() {
            shell.openExternal('https://github.com/zxch3n/PomodoroLogger');
        }

        return (
            <Container>
                <h4>Focus Duration</h4>
                <SliderContainer>
                    <Slider
                        marks={marks}
                        step={1}
                        min={process.env.NODE_ENV === 'production' ? 20 : 2}
                        max={60}
                        value={props.focusDuration / 60}
                        onChange={onChangeFocus}
                    />
                </SliderContainer>

                <Row>
                    <Col span={12}>
                        <h4>Short Break</h4>
                        <SliderContainer>
                            <Slider
                                marks={restMarks}
                                step={1}
                                min={process.env.NODE_ENV === 'production' ? 5 : 1}
                                max={10}
                                value={props.restDuration / 60}
                                onChange={onChangeRest}
                            />
                        </SliderContainer>
                    </Col>
                    <Col span={12}>
                        <h4>Long Break</h4>
                        <SliderContainer>
                            <Slider
                                marks={longBreakMarks}
                                step={1}
                                min={10}
                                max={20}
                                value={props.longBreakDuration / 60}
                                onChange={onChangeLongBreak}
                            />
                        </SliderContainer>
                    </Col>
                </Row>

                <span style={{ fontWeight: 500, fontSize: 14, color: 'rgba(0, 0, 0, 0.85)' }}>
                    Start On Boot
                </span>
                <Switch
                    onChange={setStartOnBoot}
                    checked={props.startOnBoot}
                    style={{ margin: 8 }}
                />
                <br />

                <span style={{ fontWeight: 500, fontSize: 14, color: 'rgba(0, 0, 0, 0.85' }}>
                    Screenshot
                </span>
                <Switch
                    onChange={switchScreenshot}
                    checked={!!props.screenShotInterval}
                    style={{ margin: 8 }}
                />

                <h4>Data Management</h4>
                <ButtonWrapper>
                    <Button onClick={onExportingData}>Export Data</Button>
                    <br />
                </ButtonWrapper>
                <ButtonWrapper>
                    <Popconfirm title={'Sure to delete?'} onConfirm={onDeleteData}>
                        <Button type="danger">Delete All Data</Button>
                    </Popconfirm>
                </ButtonWrapper>
                <h4>Misc</h4>
                <ButtonWrapper>
                    <Button onClick={openIssuePage}>Feedback</Button>
                    <br />
                </ButtonWrapper>
                <ButtonWrapper>
                    <DistractingListModalButton />
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledIcon
                        type="github"
                        onClick={openGithubPage}
                        title="This project is open-source and hosted on GitHub"
                    />
                    <br />
                </ButtonWrapper>
            </Container>
        );
    },
    (prevProps, nextProps) => {
        return isShallowEqualByKeys(prevProps, nextProps, settingUiStates);
    }
);
