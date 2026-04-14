import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Game {
  id: number;
  name: string;
  cover_url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = 'http://localhost:8080/api/games';

  constructor(private http: HttpClient) {}

  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>(this.apiUrl);
  }

  getGameNames(): Observable<string[]> {
    return this.getGames().pipe(
      map(games => games.map(g => g.name))
    );
  }

  addGame(name: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { name });
  }
}
