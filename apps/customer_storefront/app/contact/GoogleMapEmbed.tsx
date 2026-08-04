'use client';

import { useEffect, useRef, useState } from 'react';

export interface GoogleMapEmbedProps {
  placeId?: string;
  address?: string;
  tagline?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  zoom?: number;
  apiKey?: string;
}

export function GoogleMapEmbed({
  placeId = 'ChIJH4nhmJAnrTARgEupScnGdJI',
  address = 'Emdad Park, 665 Percival Hill Road, Chittagong',
  tagline = 'Save Money. Live Better.',
  logoUrl = '/logo-main.png',
  phone = '+8801731944544',
  email = 'hello@luckystore1947.com',
  websiteUrl = 'https://luckystore1947.com',
  facebookUrl = 'https://facebook.com/luckystore1947',
  instagramUrl = 'https://instagram.com/luckystore1947',
  zoom = 13,
  apiKey,
}: GoogleMapEmbedProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || !key.trim() || key.includes('YOUR_API_KEY')) {
      setError('Google Maps API key missing or invalid. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
      return;
    }

    if (!mapRef.current) return;
    const container = mapRef.current;

    function initMap() {
      const google = (window as any).google;
      if (!google || !container) return;

      const map = new google.maps.Map(container, {
        center: { lat: 22.3569, lng: 91.7832 },
        zoom,
        mapId: 'DEMO_MAP_ID',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const infowindow = new google.maps.InfoWindow();

      // Custom store marker icon fallback
      const storeMarkerIcon = {
        url: '/favicon-48x48.png',
        scaledSize: new google.maps.Size(40, 40),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(20, 40),
      };

      // Create primary Lucky Store marker (with custom favicon icon)
      const createStoreMarker = (position: any, title?: string) => {
        if (google.maps.marker && (google.maps.marker as any).AdvancedMarkerElement) {
          const pinImg = document.createElement('img');
          pinImg.src = '/favicon-48x48.png';
          pinImg.className = 'w-10 h-10 object-contain cursor-pointer';
          pinImg.alt = title || 'Lucky Store';

          return new (google.maps.marker as any).AdvancedMarkerElement({
            map,
            position,
            title: title || 'Lucky Store',
            content: pinImg,
          });
        }

        return new google.maps.Marker({
          map,
          position,
          title: title || 'Lucky Store',
          icon: storeMarkerIcon,
        });
      };

      // Create nearby place marker (standard red pin, not Lucky Store icon)
      const createNearbyPlaceMarker = (position: any, title?: string) => {
        if (google.maps.marker && (google.maps.marker as any).AdvancedMarkerElement && (google.maps.marker as any).PinElement) {
          const pin = new (google.maps.marker as any).PinElement({
            background: '#ea4335',
            borderColor: '#b31412',
            glyphColor: '#ffffff',
          });

          return new (google.maps.marker as any).AdvancedMarkerElement({
            map,
            position,
            title: title || 'Nearby Place',
            content: pin.element,
          });
        }

        return new google.maps.Marker({
          map,
          position,
          title: title || 'Nearby Place',
        });
      };

      const addMarkerClickListener = (marker: any, handler: () => void) => {
        if (google.maps.marker && (google.maps.marker as any).AdvancedMarkerElement && marker instanceof (google.maps.marker as any).AdvancedMarkerElement) {
          marker.addListener('gmp-click', handler);
        } else if (marker.addListener) {
          marker.addListener('click', handler);
        }
      };

      // Add custom 'Find Location' control button
      const locationButton = document.createElement('button');
      locationButton.textContent = '📍 Find Location';
      locationButton.className =
        'm-2 sm:m-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-warm-surface text-warm-fg font-semibold text-[11px] sm:text-xs rounded-xl shadow-warm-sm border border-warm-border hover:bg-warm-bg focus:outline-none cursor-pointer transition-all touch-manipulation';
      map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);

      let currentPlaceMarkers: any[] = [];

      locationButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser.');
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            // Remove existing current place markers
            currentPlaceMarkers.forEach((m) => m.setMap(null));
            currentPlaceMarkers = [];

            // Add user location marker
            const userMarker = new google.maps.Marker({
              position: pos,
              map,
              title: 'Your Current Location',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: 'var(--color-accent, #f0c444)',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: 'var(--color-foreground, #0B0B0D)',
              },
            });
            currentPlaceMarkers.push(userMarker);

            map.setCenter(pos);
            map.setZoom(16);

            const fetchNearbyPlaces = async () => {
              try {
                if (google.maps.places && (google.maps.places as any).Place && (google.maps.places as any).Place.searchNearby) {
                  const { places } = await (google.maps.places as any).Place.searchNearby({
                    fields: ['displayName', 'formattedAddress', 'location', 'rating'],
                    locationRestriction: {
                      center: pos,
                      radius: 500,
                    },
                    maxResultCount: 5,
                  });

                  if (places && places.length > 0) {
                    places.forEach((place: any) => {
                      if (!place.location) return;
                      const title = place.displayName || 'Nearby Place';

                      const placeMarker = createNearbyPlaceMarker(place.location, title);
                      currentPlaceMarkers.push(placeMarker);

                      addMarkerClickListener(placeMarker, () => {
                        const content = document.createElement('div');
                        content.className = 'p-2 max-w-xs';

                        const nameElem = document.createElement('h4');
                        nameElem.textContent = title;
                        nameElem.className = 'font-bold text-base text-warm-fg mb-1';
                        content.appendChild(nameElem);

                        if (place.formattedAddress) {
                          const addressElem = document.createElement('p');
                          addressElem.textContent = place.formattedAddress;
                          addressElem.className = 'text-sm text-warm-muted mb-1';
                          content.appendChild(addressElem);
                        }

                        if (place.rating) {
                          const ratingElem = document.createElement('p');
                          ratingElem.textContent = `Rating: ⭐ ${place.rating}`;
                          ratingElem.className = 'text-sm text-[#92400e] font-bold';
                          content.appendChild(ratingElem);
                        }

                        infowindow.setContent(content);
                        infowindow.open(map, placeMarker);
                      });
                    });
                    return;
                  }
                }
              } catch (e) {
                // Fallback to PlacesService if searchNearby throws
              }

              const service = new google.maps.places.PlacesService(map);
              service.nearbySearch(
                {
                  location: pos,
                  radius: 500,
                },
                (results: any[], status: any) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const likelyPlaces = results.slice(0, 5);
                    likelyPlaces.forEach((place) => {
                      if (!place.geometry || !place.geometry.location) return;

                      const placeMarker = createNearbyPlaceMarker(place.geometry.location, place.name);
                      currentPlaceMarkers.push(placeMarker);

                      addMarkerClickListener(placeMarker, () => {
                        const content = document.createElement('div');
                        content.className = 'p-2 max-w-xs';

                        const nameElem = document.createElement('h4');
                        nameElem.textContent = place.name || 'Unknown Place';
                        nameElem.className = 'font-bold text-base text-warm-fg mb-1';
                        content.appendChild(nameElem);

                        if (place.vicinity) {
                          const addressElem = document.createElement('p');
                          addressElem.textContent = place.vicinity;
                          addressElem.className = 'text-sm text-warm-muted mb-1';
                          content.appendChild(addressElem);
                        }

                        if (place.rating) {
                          const ratingElem = document.createElement('p');
                          ratingElem.textContent = `Rating: ⭐ ${place.rating}`;
                          ratingElem.className = 'text-sm text-[#92400e] font-bold';
                          content.appendChild(ratingElem);
                        }

                        infowindow.setContent(content);
                        infowindow.open(map, placeMarker);
                      });
                    });
                  }
                }
              );
            };

            fetchNearbyPlaces();
          },
          () => {
            alert('Unable to retrieve your location. Please ensure location permissions are granted.');
          }
        );
      });

      const buildInfoWindowDOM = (storeTitle?: string, storeAddress?: string) => {
        const content = document.createElement('div');
        content.className =
          'p-2 sm:p-2.5 md:p-3 w-[78vw] max-w-[240px] sm:max-w-[250px] md:max-w-[270px] lg:max-w-[310px] font-sans text-warm-fg space-y-1 sm:space-y-1.5 antialiased box-border overflow-hidden';

        // Logo or Title
        if (logoUrl) {
          const logoImg = document.createElement('img');
          logoImg.src = logoUrl;
          logoImg.alt = storeTitle || 'Lucky Store Logo';
          logoImg.className = 'h-9 sm:h-11 w-auto max-w-[230px] sm:max-w-[260px] object-contain mb-1';
          content.appendChild(logoImg);
        } else {
          const nameElement = document.createElement('h3');
          nameElement.textContent = storeTitle || 'Lucky Store';
          nameElement.className = 'font-black text-base sm:text-lg text-warm-fg tracking-tight mb-0.5';
          content.appendChild(nameElement);
        }

        // Format address to remove 4203 and Bangladesh
        const displayAddress = (storeAddress || address)
          .replace(/,?\s*4203/gi, '')
          .replace(/,?\s*Bangladesh/gi, '')
          .trim();

        // Address with Icon
        const addressRow = document.createElement('div');
        addressRow.className = 'flex items-start gap-2 text-xs sm:text-sm text-warm-muted font-medium leading-relaxed mb-1.5';
        addressRow.innerHTML = `
          <svg class="w-4 h-4 sm:w-5 sm:h-5 text-warm-muted/70 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="break-words">${displayAddress}</span>
        `;
        content.appendChild(addressRow);

        // Website Row with Icon
        if (websiteUrl) {
          const websiteRow = document.createElement('a');
          websiteRow.href = websiteUrl;
          websiteRow.target = '_blank';
          websiteRow.rel = 'noopener noreferrer';
          websiteRow.className =
            'flex items-center gap-2 py-1 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 active:text-blue-700 transition-colors group mb-1.5 touch-manipulation';
          const displayDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          websiteRow.innerHTML = `
            <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 group-hover:text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
            </svg>
            <span>${displayDomain} ↗</span>
          `;
          content.appendChild(websiteRow);
        }

        // Contact & Social Links Row (Facebook, Instagram, WhatsApp & Email logo icons)
        if (facebookUrl || instagramUrl || phone || email) {
          const socialRow = document.createElement('div');
          socialRow.className = 'flex items-center gap-3.5 pt-2 border-t border-warm-border/50 mt-1.5';

          if (facebookUrl) {
            const fbLink = document.createElement('a');
            fbLink.href = facebookUrl;
            fbLink.target = '_blank';
            fbLink.rel = 'noopener noreferrer';
            fbLink.setAttribute('aria-label', 'Facebook');
            fbLink.className =
              'text-[#1877F2] hover:opacity-80 active:scale-95 transition-opacity touch-manipulation inline-flex items-center justify-center';
            fbLink.innerHTML = `
              <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            `;
            socialRow.appendChild(fbLink);
          }

          if (instagramUrl) {
            const igLink = document.createElement('a');
            igLink.href = instagramUrl;
            igLink.target = '_blank';
            igLink.rel = 'noopener noreferrer';
            igLink.setAttribute('aria-label', 'Instagram');
            igLink.className =
              'text-[#E4405F] hover:opacity-80 active:scale-95 transition-opacity touch-manipulation inline-flex items-center justify-center';
            igLink.innerHTML = `
              <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            `;
            socialRow.appendChild(igLink);
          }

          if (phone) {
            const cleanPhone = phone.replace(/[^\d]/g, '');
            const waLink = document.createElement('a');
            waLink.href = `https://wa.me/${cleanPhone}`;
            waLink.target = '_blank';
            waLink.rel = 'noopener noreferrer';
            waLink.setAttribute('aria-label', 'WhatsApp');
            waLink.className =
              'text-[#25D366] hover:opacity-80 active:scale-95 transition-opacity touch-manipulation inline-flex items-center justify-center';
            waLink.innerHTML = `
              <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            `;
            socialRow.appendChild(waLink);
          }

          if (email) {
            const emailLink = document.createElement('a');
            emailLink.href = `mailto:${email}`;
            emailLink.setAttribute('aria-label', 'Email Us');
            emailLink.className =
              'hover:opacity-80 active:scale-95 transition-opacity touch-manipulation inline-flex items-center justify-center';
            emailLink.innerHTML = `
              <svg class="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" opacity="0.1"/>
                <path fill="#EA4335" d="M20 18h-2V9.25L12 14 6 9.25V18H4V6h1.75l6.25 4.9L18.25 6H20v12z"/>
              </svg>
            `;
            socialRow.appendChild(emailLink);
          }

          content.appendChild(socialRow);
        }

        // Tagline at the end
        if (tagline) {
          const taglineElement = document.createElement('p');
          taglineElement.textContent = tagline;
          taglineElement.className =
            'text-xs sm:text-sm font-extrabold text-[#92400e] tracking-tight pt-1.5 border-t border-warm-border/40 mt-1';
          content.appendChild(taglineElement);
        }

        return content;
      };

      if (placeId && placeId.startsWith('ChIJ')) {
        const fetchPlaceDetails = async () => {
          try {
            if (google.maps.places && (google.maps.places as any).Place) {
              const place = new (google.maps.places as any).Place({ id: placeId });
              await place.fetchFields({
                fields: ['displayName', 'formattedAddress', 'location'],
              });

              if (place.location) {
                const marker = createStoreMarker(place.location, place.displayName || 'Lucky Store');

                map.setCenter(place.location);

                addMarkerClickListener(marker, () => {
                  const content = buildInfoWindowDOM(place.displayName || 'Lucky Store', place.formattedAddress || address);
                  infowindow.setContent(content);
                  infowindow.setOptions({ ariaLabel: place.displayName || 'Lucky Store' });
                  infowindow.open(map, marker);
                  map.panBy(0, -50);
                });
                return;
              }
            }
          } catch (e) {
            // Fallback to legacy PlacesService if Place class throws
          }

          const service = new google.maps.places.PlacesService(map);
          service.getDetails(
            {
              placeId,
              fields: ['name', 'formatted_address', 'place_id', 'geometry'],
            },
            (place: any, status: any) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                place &&
                place.geometry &&
                place.geometry.location
              ) {
                const marker = createStoreMarker(place.geometry.location, place.name);

                map.setCenter(place.geometry.location);

                addMarkerClickListener(marker, () => {
                  const content = buildInfoWindowDOM(place.name, place.formatted_address || address);
                  infowindow.setContent(content);
                  infowindow.setOptions({ ariaLabel: place.name || 'Lucky Store' });
                  infowindow.open(map, marker);
                  map.panBy(0, -50);
                });
              }
            }
          );
        };

        fetchPlaceDetails();
      } else {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(16);

            const marker = createStoreMarker(location, 'Lucky Store');

            addMarkerClickListener(marker, () => {
              const content = buildInfoWindowDOM('Lucky Store', address);
              infowindow.setContent(content);
              infowindow.setOptions({ ariaLabel: 'Lucky Store' });
              infowindow.open(map, marker);
              map.panBy(0, -50);
            });
          }
        });
      }
    }

    const anyWindow = window as any;

    if (anyWindow.google && anyWindow.google.maps) {
      initMap();
      return;
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initGoogleMap&libraries=places,marker&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    anyWindow.initGoogleMap = initMap;

    return () => {
      delete anyWindow.initGoogleMap;
    };
  }, [placeId, address, tagline, logoUrl, phone, email, websiteUrl, facebookUrl, instagramUrl, zoom, apiKey]);

  if (error) {
    return (
      <div className="flex h-full min-h-[380px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-warm-border bg-warm-surface p-6 text-center">
        <p className="text-sm font-semibold text-warm-foreground">{error}</p>
        <p className="mt-2 text-xs text-warm-muted">
          Set <code className="rounded bg-warm-border/40 px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full rounded-[28px]"
      aria-label="Google Map showing Lucky Store location"
      role="application"
    />
  );
}
