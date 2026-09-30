import { randomEmail, randomString, randomNumber } from '../utils/helpers';

export interface UserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'admin' | 'user' | 'agent';
}

export interface ApplicantData {
  fullName: string;
  nik: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female';
  address: string;
  monthlyIncome: number;
}

export class UserFactory {
  /**
   * Generates a valid user data object
   */
  static createValidUser(overrides: Partial<UserData> = {}): UserData {
    const rand = randomString(5);
    return {
      username: `user_${rand.toLowerCase()}`,
      email: randomEmail('qa_tester'),
      password: `Pass@${randomString(8)}123`,
      fullName: `Test User ${rand}`,
      phone: `0812${randomNumber(10000000, 99999999)}`,
      role: 'user',
      ...overrides,
    };
  }

  /**
   * Generates an invalid user (for negative auth tests)
   */
  static createInvalidUser(): { username: string; password: string } {
    return {
      username: `invalid_${randomString(6)}`,
      password: 'WrongPassword999!',
    };
  }

  /**
   * Generates applicant data for forms & KYC testing
   */
  static createApplicant(overrides: Partial<ApplicantData> = {}): ApplicantData {
    const firstNames = ['Budi', 'Siti', 'Ahmad', 'Rian', 'Dewi', 'Eko', 'Putri', 'Dimas'];
    const lastNames = ['Pratama', 'Kusuma', 'Santoso', 'Wijaya', 'Siregar', 'Hidayat'];
    const randFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randLast = lastNames[Math.floor(Math.random() * lastNames.length)];

    return {
      fullName: `${randFirst} ${randLast}`,
      nik: `317101${randomNumber(1000000000, 9999999999)}`,
      email: randomEmail(randFirst.toLowerCase()),
      phone: `0812${randomNumber(10000000, 99999999)}`,
      birthDate: '1995-05-20',
      gender: Math.random() > 0.5 ? 'male' : 'female',
      address: `Jl. Jendral Sudirman No. ${randomNumber(1, 150)}, Jakarta`,
      monthlyIncome: randomNumber(10000000, 25000000),
      ...overrides,
    };
  }
}

export default UserFactory;
