import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, Roles } from './auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('Debe ingresar correo y contraseña');
    }
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('auth/me')
  me(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @Post('users')
  createUser(
    @Body() body: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'VENDEDOR' },
  ) {
    return this.authService.createUser({
      name: body?.name || '',
      email: body?.email || '',
      password: body?.password || '',
      role: body?.role || 'VENDEDOR',
    });
  }
}
