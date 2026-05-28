import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { MembershipsService } from './memberships.service';

@Controller('memberships')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('courses')
  listCourses(@Request() req: { tenantId: string }) {
    return this.membershipsService.listCourses(req.tenantId);
  }

  @Get('courses/:id')
  getCourse(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.membershipsService.getCourse(req.tenantId, id);
  }

  @Post('courses')
  createCourse(@Request() req: { tenantId: string }, @Body() data: Record<string, unknown>) {
    return this.membershipsService.createCourse(req.tenantId, data as any);
  }

  @Patch('courses/:id')
  updateCourse(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.membershipsService.updateCourse(req.tenantId, id, data as any);
  }

  @Delete('courses/:id')
  deleteCourse(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.membershipsService.deleteCourse(req.tenantId, id);
  }

  @Get('courses/:courseId/lessons')
  listLessons(@Request() req: { tenantId: string }, @Param('courseId') courseId: string) {
    return this.membershipsService.listLessons(req.tenantId, courseId);
  }

  @Post('courses/:courseId/lessons')
  createLesson(
    @Request() req: { tenantId: string },
    @Param('courseId') courseId: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.membershipsService.createLesson(req.tenantId, courseId, data as any);
  }

  @Patch('courses/:courseId/lessons/:lessonId')
  updateLesson(
    @Request() req: { tenantId: string },
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.membershipsService.updateLesson(req.tenantId, courseId, lessonId, data as any);
  }

  @Delete('courses/:courseId/lessons/:lessonId')
  deleteLesson(
    @Request() req: { tenantId: string },
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.membershipsService.deleteLesson(req.tenantId, courseId, lessonId);
  }

  @Get('offers')
  listOffers(@Request() req: { tenantId: string }) {
    return this.membershipsService.listOffers(req.tenantId);
  }

  @Post('offers')
  createOffer(@Request() req: { tenantId: string }, @Body() data: Record<string, unknown>) {
    return this.membershipsService.createOffer(req.tenantId, data as any);
  }

  @Patch('offers/:id')
  updateOffer(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.membershipsService.updateOffer(req.tenantId, id, data as any);
  }

  @Delete('offers/:id')
  deleteOffer(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.membershipsService.deleteOffer(req.tenantId, id);
  }

  @Get('enrollments')
  listEnrollments(
    @Request() req: { tenantId: string },
    @Query('courseId') courseId?: string,
  ) {
    return this.membershipsService.listEnrollments(req.tenantId, courseId);
  }

  @Post('courses/:courseId/enroll')
  enroll(
    @Request() req: { tenantId: string },
    @Param('courseId') courseId: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.membershipsService.enroll(req.tenantId, courseId, data);
  }

  @Delete('enrollments/:id')
  unenroll(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.membershipsService.unenroll(req.tenantId, id);
  }

  @Patch('enrollments/:id/progress')
  updateProgress(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body('lessonId') lessonId: string,
    @Body('completed') completed = true,
  ) {
    return this.membershipsService.markLessonCompleted(req.tenantId, id, lessonId, Boolean(completed));
  }
}
