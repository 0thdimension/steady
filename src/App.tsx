import { useEffect } from 'react';
import { useStore } from './data/store';
import { startHeartbeat } from './data/storage';
import Nav from './components/Nav';
import Today from './screens/Today';
import Todos from './screens/Todos';
import Progress from './screens/Progress';
import ExerciseScreen from './screens/Exercise';
import Projects from './screens/Projects';
import Journal from './screens/Journal';
import SettingsScreen from './screens/Settings';

function Backdrop() {
  const bgUrl = useStore((s) => s.bgUrl);
  return (
    <div className="backdrop" aria-hidden="true">
      {bgUrl ? (
        <>
          <img className="photo" src={bgUrl} alt="" />
          <div className="photo-tint" />
        </>
      ) : (
        <>
          <div className="glow-a" />
          <div className="glow-b" />
          <div className="mull" style={{ left: '19%' }} />
          <div className="mull" style={{ left: '33%' }} />
          <div className="floor" />
        </>
      )}
    </div>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.data.settings.theme);
  const blur = useStore((s) => s.data.settings.blur);
  const timerOn = useStore((s) => !!s.data.settings.timer);
  const loadError = useStore((s) => s.loadError);
  const saveState = useStore((s) => s.saveState);

  useEffect(() => { void useStore.getState().init(); startHeartbeat(); }, []);
  const panelOpacity = useStore((s) => s.data.settings.panelOpacity);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const root = document.documentElement.style;
    if (panelOpacity == null) root.removeProperty('--panel-opacity');
    else root.setProperty('--panel-opacity', String(Math.min(1, Math.max(0.2, panelOpacity))));
  }, [panelOpacity]);
  useEffect(() => {
    const id = window.setInterval(() => useStore.getState().tick(), timerOn ? 1000 : 30000);
    return () => window.clearInterval(id);
  }, [timerOn]);

  if (!ready) {
    return (
      <>
        <Backdrop />
        <div className="app"><p className="muted" style={{ textAlign: 'center', marginTop: '30vh' }}>Opening Steady…</p></div>
      </>
    );
  }

  return (
    <>
      <Backdrop />
      <div className={'app' + (blur ? '' : ' no-blur')}>
        <div className="layer">
          <Nav />
          {loadError && (
            <div className="banner" role="alert">
              <span>Your saved data couldn't be read, so Steady started fresh. Your earlier file and backups are still in the data folder (Settings › Data).</span>
            </div>
          )}
          {saveState === 'error' && (
            <div className="banner" role="alert"><span>Steady couldn't save your last change. It will keep trying.</span></div>
          )}
          <main>
            {screen === 'today' && <Today />}
            {screen === 'todos' && <Todos />}
            {screen === 'progress' && <Progress />}
            {screen === 'exercise' && <ExerciseScreen />}
            {screen === 'projects' && <Projects />}
            {screen === 'journal' && <Journal />}
            {screen === 'settings' && <SettingsScreen />}
          </main>
        </div>
      </div>
    </>
  );
}
