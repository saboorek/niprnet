import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/login';
import { Dashboard } from '../pages/dashboard';
import { NoAuth } from '../pages/noAuth';
import { CharactersPage } from '../pages/admin/CharactersPage';
import { RolesPage } from '../pages/admin/RolesPage';
import { EmployeesPage } from '../pages/hrd/EmployeesPage';
import { EmployeeDetailsPage } from '../pages/hrd/EmployeeDetailsPage';
import { DbidsPage } from '../pages/sfs/DbidsPage';
import { AbsencesPage } from '../pages/hrd/AbsencesPage.tsx';
import { StructurePage } from '../pages/hrd/StructurePage';
import { ReportsPage } from "../pages/sfs/ReportPage.tsx";
import { MdcPage } from "../pages/mdt/MdcPage.tsx";
import { CadPage } from "../pages/mdt/CadPage.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/no-auth',
        element: <NoAuth />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    { path: '/dashboard',  element: <Dashboard /> },
                    { path: '/admin/roles', element: <RolesPage /> },
                    { path: '/admin/profiles', element: <CharactersPage /> },
                    { path: '/hrd/employees', element: <EmployeesPage /> },
                    { path: '/hrd/employees/:id', element: <EmployeeDetailsPage /> },
                    { path: '/hrd/structure', element: <StructurePage /> },
                    { path: '/hrd/absences', element: <AbsencesPage/> },
                    { path: '/sfs/dbids', element: <DbidsPage /> },
                    { path: `/sfs/reports`, element: <ReportsPage /> },
                    { path: `/mdt/mdc`, element: <MdcPage /> },
                    { path: `/mdt/cad`, element: <CadPage />}

                ],
            },
        ],
    },
]);