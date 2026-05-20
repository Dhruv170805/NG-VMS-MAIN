import { Response, Request, RequestHandler } from 'express';
import Employee from '../../models/Employee';
import { TenantRequest, AuthRequest } from '../../types/requests';
import { AuthService } from './auth.service';

export const registerEmployee: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId } = req as TenantRequest;
  try {
    const { employee, token } = await AuthService.registerEmployee(body, tenantId!);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      requiresPasswordChange: employee.requiresPasswordChange,
      token
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const loginEmployee: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId } = req as TenantRequest;
  try {
    const { employee, token } = await AuthService.loginEmployee(body, tenantId!);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      requiresPasswordChange: employee.requiresPasswordChange,
      token
    });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const logoutEmployee: RequestHandler = async (req, res): Promise<void> => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const updatePassword: RequestHandler = async (req, res): Promise<void> => {
  const { user, tenantId, body } = req as AuthRequest;
  try {
    await AuthService.updatePassword(user!.id, tenantId!, body);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(error.message === 'Employee not found' ? 404 : 401).json({ message: error.message });
  }
};

export const forgotPassword: RequestHandler = async (req, res): Promise<void> => {
  const { body, tenantId, protocol } = req as TenantRequest;
  try {
    const resetUrl = await AuthService.forgotPassword(
      body.email, 
      tenantId!, 
      protocol, 
      req.get('host') as string
    );
    
    res.json({ 
      success: true, 
      message: 'Reset token generated and sent to email', 
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl 
    });
  } catch (error: any) {
    res.status(error.message === 'No employee with that email' ? 404 : 500).json({ message: error.message });
  }
};

export const resetPassword: RequestHandler = async (req, res): Promise<void> => {
  const { params, body, tenantId } = req as TenantRequest;
  try {
    await AuthService.resetPassword(params.resetToken as string, body.password, tenantId!);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMe: RequestHandler = async (req, res): Promise<void> => {
  const { user, tenantId } = req as AuthRequest;
  try {
    const employee = await Employee.findOne({ _id: user!.id, tenantId: tenantId! }).select('-password');
    if (!employee) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};
