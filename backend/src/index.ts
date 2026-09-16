import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import cron from 'node-cron';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { connectDatabase } from './config/database';
import { Role } from './models/Role';
import { syncEmployeeStatuses } from './utils/syncEmployeeStatuses';

// --- Import Routes --- //
import auth from './routes/auth';
import reportRoutes from './routes/reports';
import characters from './routes/characters';
import dbidsRoutes from './routes/dbids';
import './models/DiscordUser';
import roles from './routes/roles';
import meta from './routes/meta';
import employeeRoutes from './routes/employees';
import structureRoutes from './routes/structure';
import absenceRoutes from './routes/absences';
import mdcRoutes from './routes/mdc';
import cadSettingsRouter from './routes/cadSettings';
import cadUnitsRouter from './routes/cadUnits';

const requiredEnvVars = [
    'MONGO_URL',
    'SESSION_SECRET',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'DISCORD_CALLBACK_URL',
    'FRONTEND_URL'
];

async function migrateRoles() {
    const defaultPermissions = {
        // === Administracja ===
        'permissions.hasAdminAccess': false,
        'permissions.canManagePermission': false,
        'permissions.hasStatisticAccess': false,

        // === HR ===
        'permissions.hasHumanResourcesAccess': false,
        'permissions.hasEmployeeAccess': false,
        'permissions.hasStructureAccess': false,
        'permissions.hasAbsenceAccess': false,
        'permissions.canEditCharacter': false,
        'permissions.canEditRibbons': false,
        'permissions.canAddAbsence': false,
        'permissions.canRemoveAbsence': false,
        'permissions.canAddReprimands': false,
        'permissions.canRemoveReprimands': false,
        'permissions.canAddPraises': false,
        'permissions.canRemovePraises': false,
        'permissions.canAddPromotions': false,
        'permissions.canRemovePromotions': false,
        'permissions.canAddDemotes': false,
        'permissions.canRemoveDemotes': false,
        'permissions.canAddStructure': false,
        'permissions.canRemoveStructure': false,
        'permissions.canEditStructure': false,

        // === SFS ===
        'permissions.hasSecurityForcesAccess': false,
        'permissions.hasReportAccess': false,
        'permissions.hasFleetAccess': false,
        'permissions.hasDBIDSAccess': false,
        'permissions.canAddPass': false,
        'permissions.canRemovePass': false,
        'permissions.canAddReport': false,
        'permissions.canRemoveReport': false,

        // === MDT / CAD ===
        'permissions.hasMDTAccess': false,
        'permissions.hasCADAccess': false,
        'permissions.canAddMDCRecord': false,
        'permissions.canRemoveMDCRecord': false,
        'permissions.canEditUnitType': false,
        'permissions.canEditStatus': false,
        'permissions.canAddMDCReqCode': false,
        'permissions.canRemoveMDCReqCode': false,
    };

    for (const [key, defaultValue] of Object.entries(defaultPermissions)) {
        await Role.updateMany(
            { [key]: { $exists: false } },
            { $set: { [key]: defaultValue } }
        );
    }

    console.log('✅ Pomyślnie zweryfikowano i zaktualizowano strukturę uprawnień ról.');
}

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL!;

app.use(express.json());

app.use(cors({
    origin: frontendUrl,
    credentials: true,
}));

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URL!,
        touchAfter: 24 * 3600,
    }),
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj: Express.User, done) => done(null, obj));

console.log('📌 REGISTERED DISCORD CALLBACK:', process.env.DISCORD_CALLBACK_URL);

passport.use(new DiscordStrategy(
    {
        clientID: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        callbackURL: process.env.DISCORD_CALLBACK_URL!,
        scope: ['identify', 'guilds'],
    },
    (_accessToken, _refreshToken, profile, done) => done(null, profile)
));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', auth);
app.use('/api/characters', characters);
app.use('/api/roles', roles);
app.use('/api/meta', meta);
app.use('/api/employees', employeeRoutes);
app.use('/api/dbids', dbidsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/structure', structureRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/mdc', mdcRoutes);
app.use('/api/cad/settings', cadSettingsRouter);
app.use('/api/cad/units', cadUnitsRouter);
app.use('/api/cad', cadSettingsRouter);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDatabase();
        await migrateRoles();
        console.log('⏰ Uruchamianie natychmiastowej synchronizacji nieobecności...');
        await syncEmployeeStatuses();

        cron.schedule('*/5 * * * *', async () => {
            try {
                await syncEmployeeStatuses();
            } catch (err) {
                console.error('❌ [CRON] Błąd podczas synchronizacji nieobecności:', err);
            }
        });

        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (env: ${process.env.NODE_ENV ?? 'development'}, frontend: ${frontendUrl})`));
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

void startServer();