import { MembershipsService } from './memberships.service';

const repoMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (value) => value),
  create: jest.fn((value) => value),
  remove: jest.fn(),
  count: jest.fn(),
});

describe('MembershipsService', () => {
  it('crea inscripción y dispara membership.enrolled', async () => {
    const courseRepo = repoMock();
    const lessonRepo = repoMock();
    const enrollmentRepo = repoMock();
    const offerRepo = repoMock();
    const crmService = { fireTrigger: jest.fn().mockResolvedValue(undefined) };

    courseRepo.findOne.mockResolvedValue({
      id: 'course-1',
      tenantId: 'tenant-1',
      title: 'Curso de Ventas',
      slug: 'curso-ventas',
      isPublished: true,
    });
    enrollmentRepo.findOne.mockResolvedValue(null);
    enrollmentRepo.save.mockImplementation(async (value) => ({ id: 'enr-1', ...value }));

    const service = new MembershipsService(
      courseRepo as any,
      lessonRepo as any,
      enrollmentRepo as any,
      offerRepo as any,
      crmService as any,
    );

    const result = await service.enroll('tenant-1', 'course-1', {
      studentName: 'Juan',
      studentEmail: 'juan@example.com',
    });

    expect(result.id).toBe('enr-1');
    expect(result.studentEmail).toBe('juan@example.com');
    expect(crmService.fireTrigger).toHaveBeenCalledWith(
      'tenant-1',
      'membership.enrolled',
      expect.objectContaining({
        courseId: 'course-1',
        enrollmentId: 'enr-1',
        studentEmail: 'juan@example.com',
      }),
    );
  });
});
