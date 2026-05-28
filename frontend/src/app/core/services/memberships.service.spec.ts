import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MembershipsService } from './memberships.service';
import { environment } from '../../../environments/environment';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(MembershipsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe llamar al endpoint de cursos', () => {
    service.listCourses().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/memberships/courses`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
