import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div style={styles.root}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  body: { display: 'flex', flex: 1 },
  main: { flex: 1, padding: '1.5rem', overflowY: 'auto' },
};
