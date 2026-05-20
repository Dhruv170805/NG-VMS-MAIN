import { Router } from 'express';
import { 
  registerVisitor, updateVisitorStatus, getVisitors, getVisitorById, 
  lookupVisitor, exportVisitors, getVisitorTimeline, sendSecurityAlert,
  updateIdProofPreview, getIdProofPreview 
} from './visitor.controller';
import { protect, authorize } from '../../middleware/authMiddleware';

const router = Router();

router.post('/register', registerVisitor);
router.get('/export', protect, authorize('ADMIN'), exportVisitors);
router.get('/lookup/:phone', lookupVisitor);
router.get('/:id/timeline', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitorTimeline);
router.get('/:id/id-preview', protect, authorize('ADMIN'), getIdProofPreview);
router.patch('/:id/status', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), updateVisitorStatus);
router.post('/:id/id-preview', protect, authorize('ADMIN', 'GUARD'), updateIdProofPreview);
router.post('/:id/notify-alert', protect, authorize('ADMIN', 'GUARD'), sendSecurityAlert);
router.get('/:id', getVisitorById);
router.get('/', protect, authorize('ADMIN', 'GUARD', 'STAFF', 'MANAGER'), getVisitors);

export default router;
